const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Rate limiting: 30 requests per 15 minutes per user
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Too many AI chat requests. Please wait a few minutes before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for emergency keywords
    const message = req.body?.message || '';
    const lowerText = message.toLowerCase();
    const emergencyKeywords = ['suicide', 'suicidal', 'kill myself', 'end my life', 'want to die'];
    return emergencyKeywords.some(keyword => lowerText.includes(keyword));
  }
});

// Request queue to prevent overwhelming the API
const requestQueue = [];
let processingQueue = false;
const MAX_CONCURRENT_REQUESTS = 3; // Process max 3 requests at once
let activeRequests = 0;

// Simple response cache for common queries (5 minute TTL)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Initialize Gemini AI provider
let gemini = null;
let geminiModelName = null;

// Function to list available Gemini models
async function listAvailableGeminiModels(apiKey) {
  try {
    const https = require('https');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Model listing timeout')), 10000);
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const response = JSON.parse(data);
            if (response.models) {
              const availableModels = response.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
              resolve(availableModels);
            } else {
              resolve([]);
            }
          } catch (parseError) {
            reject(parseError);
          }
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    throw error;
  }
}

// Initialize Gemini if API key is available
console.log('🔍 Checking for GEMINI_API_KEY...', process.env.GEMINI_API_KEY ? 'Found' : 'Not found');
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized with key:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
    
    // Prefer flash model for speed
    geminiModelName = 'gemini-1.5-flash';
    console.log(`✅ Will use model: ${geminiModelName} (optimized for speed)`);
    
    // Verify model availability in background
    listAvailableGeminiModels(process.env.GEMINI_API_KEY)
      .then((models) => {
        if (models && models.length > 0) {
          console.log('📋 Available Gemini models:', models.join(', '));
          // Prefer flash if available, otherwise use first available
          const flashModel = models.find(m => m.includes('flash'));
          geminiModelName = flashModel || models[0];
          console.log(`✅ Using optimized model: ${geminiModelName}`);
        }
      })
      .catch((listError) => {
        console.warn('⚠️ Could not list available models:', listError.message);
        console.warn('⚠️ Will use default model: gemini-1.5-flash');
      });
  } catch (error) {
    console.error('❌ Gemini initialization error:', error.message);
    console.warn('⚠️ Gemini package not installed. Install with: npm install @google/generative-ai');
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
}

// OpenAI removed - using Gemini only

// Risk keywords that trigger emergency protocols
const RISK_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
  'self harm', 'cutting', 'hurting myself', 'harm myself',
  'no reason to live', 'better off dead', 'give up'
];

// Check for risk keywords in text
const detectRiskKeywords = (text) => {
  const lowerText = text.toLowerCase();
  return RISK_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Retry function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Call Gemini API with timeout and retry
async function callGeminiAPI(model, messageWithContext, chatHistory, timeoutMs = 25000) {
  return Promise.race([
    retryWithBackoff(async () => {
      const chat = chatHistory.length > 0 
        ? model.startChat({ history: chatHistory })
        : model.startChat();
      
      const result = await chat.sendMessage(messageWithContext, {
        generationConfig: {
          maxOutputTokens: 500, // Limit response length for speed
          temperature: 0.7,
        }
      });
      
      return result.response.text();
    }, 2), // 2 retries
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs)
    )
  ]);
}

// Process queue
async function processQueue() {
  if (processingQueue || requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }
  
  processingQueue = true;
  
  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const { req, res, next } = requestQueue.shift();
    activeRequests++;
    
    // Process request asynchronously
    handleAIRequest(req, res, next).finally(() => {
      activeRequests--;
      processQueue(); // Process next in queue
    });
  }
  
  processingQueue = false;
}

// Main AI request handler
async function handleAIRequest(req, res, next) {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Check cache first (for non-emergency queries)
    const cacheKey = message.toLowerCase().trim().substring(0, 100);
    if (!detectRiskKeywords(message)) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('💾 Serving from cache');
        return res.json({
          message: cached.response,
          isEmergency: false
        });
      }
    }

    // Check for risk keywords
    const hasRiskKeywords = detectRiskKeywords(message);

    if (hasRiskKeywords) {
      await pool.query(
        `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'ai_keyword', 'critical', `Risk keywords detected in AI chat: ${message.substring(0, 200)}`]
      );

      return res.json({
        message: `I'm concerned about what you've shared. Your safety is important. Please reach out to:

• National Suicide Prevention Lifeline: ${process.env.EMERGENCY_HOTLINE || '988'}
• Crisis Text Line: Text HOME to 741741
• Institution Support: ${process.env.INSTITUTION_EMAIL || 'support@institution.edu'}

These services are available 24/7 and are here to help.`,
        isEmergency: true,
        emergencyContacts: {
          hotline: process.env.EMERGENCY_HOTLINE || '988',
          institutionEmail: process.env.INSTITUTION_EMAIL || 'support@institution.edu',
          institutionPhone: process.env.INSTITUTION_PHONE || '+1-800-HELP'
        }
      });
    }

    // If Gemini is not available, return a helpful message
    if (!gemini) {
      return res.json({
        message: 'I\'m here to listen and support you. While I\'m not a replacement for professional help, I can help you explore your feelings. Would you like to access our resource hub or speak with a counselor?',
        isEmergency: false
      });
    }

    // Build context prompt
    let contextPrompt = 'You are a supportive, empathetic AI assistant for a mental health platform. ';
    contextPrompt += 'You provide psychological first aid and emotional support. ';
    contextPrompt += 'You are NOT a medical professional and should not provide diagnoses or medical advice. ';
    contextPrompt += 'If users express serious concerns, encourage them to seek professional help. ';
    contextPrompt += 'Keep responses brief (2-3 sentences), warm, and supportive. ';

    // Get screening results asynchronously
    const screeningPromise = pool.query(
      `SELECT test_type, score, severity FROM screening_results 
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ).catch(err => {
      console.warn('Screening query error (non-blocking):', err.message);
      return { rows: [] };
    });

    let aiResponse;

    // Use Gemini only
    try {
      const modelToUse = geminiModelName || 'gemini-1.5-flash';
      const model = gemini.getGenerativeModel({ model: modelToUse });
      
      // Build conversation history (limit to last 4 messages for speed)
      const chatHistory = [];
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 1) {
        const recentHistory = conversationHistory.slice(-4); // Only last 2 exchanges
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            chatHistory.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            });
          }
        }
      }
      
      // Add screening context if available
      const screeningResult = await screeningPromise;
      if (screeningResult.rows.length > 0) {
        const latest = screeningResult.rows[0];
        contextPrompt += `The user recently completed a ${latest.test_type} screening with a ${latest.severity} severity score (${latest.score}). `;
      }
      
      const messageWithContext = contextPrompt + '\n\nUser: ' + message;
      
      console.log('📤 Sending message to Gemini...');
      const startTime = Date.now();
      
      aiResponse = await callGeminiAPI(model, messageWithContext, chatHistory);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Received response from Gemini in ${responseTime}ms`);
      
      // Cache response
      if (!detectRiskKeywords(message)) {
        responseCache.set(cacheKey, {
          response: aiResponse,
          timestamp: Date.now()
        });
        // Clean old cache entries (keep cache under 100 entries)
        if (responseCache.size > 100) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
        }
      }
      
      res.json({
        message: aiResponse,
        isEmergency: false
      });
    } catch (geminiError) {
      console.error('❌ Gemini API error:', geminiError.message);
      console.error('❌ Error details:', geminiError);
      
      // Provide helpful error message with retry suggestion
      const errorMessage = geminiError.message || 'Unknown error';
      let userMessage = 'I\'m experiencing some technical difficulties with the AI service. ';
      
      // Check for specific error types
      if (errorMessage.includes('timeout')) {
        userMessage += 'The request took too long. Please try again with a shorter message.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        userMessage += 'The service is currently busy. Please wait a moment and try again.';
      } else if (errorMessage.includes('403') || errorMessage.includes('401')) {
        userMessage += 'There\'s an authentication issue. Please contact support.';
      } else {
        userMessage += 'Please try again in a moment, or contact support if the issue persists.';
      }
      
      return res.json({
        message: userMessage,
        isEmergency: false
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Failed to process chat message' });
  }
}

// AI Chat endpoint with rate limiting and queue
router.post('/chat', authenticate, requireStudent, aiRateLimiter, (req, res, next) => {
  // Add to queue if too many concurrent requests
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    requestQueue.push({ req, res, next });
    console.log(`📋 Request queued. Queue length: ${requestQueue.length}`);
  } else {
    activeRequests++;
    handleAIRequest(req, res, next).finally(() => {
      activeRequests--;
      processQueue();
    });
  }
});

module.exports = router;
