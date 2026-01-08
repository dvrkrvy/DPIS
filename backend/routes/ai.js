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

// Multi-key Gemini AI provider system
let geminiClients = []; // Array of { client, key, isActive, lastError }
let geminiModelName = null;
let currentKeyIndex = 0; // Round-robin index

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

// Initialize multiple Gemini API keys
function initializeGeminiKeys() {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  // Get all API keys from environment (up to 10 keys: GEMINI_API_KEY, GEMINI_API_KEY_2 ... GEMINI_API_KEY_10)
  const keys = [];
  const baseKey = process.env.GEMINI_API_KEY;
  if (baseKey && baseKey.trim() !== '') keys.push(baseKey);
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && k.trim() !== '') keys.push(k);
  }
  
  if (keys.length === 0) {
    console.warn('⚠️ No GEMINI_API_KEY found in environment variables');
    console.warn('⚠️ Set GEMINI_API_KEY, GEMINI_API_KEY_2, and GEMINI_API_KEY_3 for multi-key support');
    return;
  }
  
  console.log(`🔍 Found ${keys.length} Gemini API key(s)`);
  
  // Initialize clients for each key
  keys.forEach((key, index) => {
    try {
      const client = new GoogleGenerativeAI(key);
      geminiClients.push({
        client: client,
        key: key.substring(0, 10) + '...', // Store masked key for logging
        fullKey: key,
        isActive: true,
        lastError: null,
        errorCount: 0,
        index: index
      });
      console.log(`✅ Gemini client ${index + 1} initialized with key: ${key.substring(0, 10)}...`);
    } catch (error) {
      console.error(`❌ Failed to initialize Gemini client ${index + 1}:`, error.message);
    }
  });
  
  if (geminiClients.length === 0) {
    console.error('❌ No Gemini clients initialized');
    return;
  }
  
  // Prefer flash model for speed (use 1.5-flash, not 2.5-flash)
  geminiModelName = 'gemini-1.5-flash';
  console.log(`✅ Will use model: ${geminiModelName} (optimized for speed)`);
  console.log(`✅ Multi-key system ready with ${geminiClients.length} active key(s)`);
  
  // Verify model availability in background (use first key)
  if (geminiClients.length > 0) {
    listAvailableGeminiModels(geminiClients[0].fullKey)
      .then((models) => {
        if (models && models.length > 0) {
          console.log('📋 Available Gemini models:', models.join(', '));
          // Prefer 1.5-flash if available (not 2.5-flash which may not exist)
          const flashModel = models.find(m => m.includes('1.5-flash') || m.includes('flash'));
          if (flashModel && !flashModel.includes('2.5')) {
            geminiModelName = flashModel;
          } else {
            // Fallback to first available model that's not 2.5
            const safeModel = models.find(m => !m.includes('2.5')) || models[0];
            geminiModelName = safeModel;
          }
          console.log(`✅ Using optimized model: ${geminiModelName}`);
        }
      })
      .catch((listError) => {
        console.warn('⚠️ Could not list available models:', listError.message);
        console.warn('⚠️ Will use default model: gemini-1.5-flash');
      });
  }
}

// Initialize Gemini keys
try {
  initializeGeminiKeys();
} catch (error) {
  console.error('❌ Gemini initialization error:', error.message);
  console.warn('⚠️ Gemini package not installed. Install with: npm install @google/generative-ai');
}

// Get next available Gemini client (round-robin with fallback)
function getNextGeminiClient() {
  if (geminiClients.length === 0) return null;
  
  // Find active clients
  const activeClients = geminiClients.filter(c => c.isActive);
  
  if (activeClients.length === 0) {
    // All keys failed, reset all and try again
    console.warn('⚠️ All API keys failed, resetting all keys');
    geminiClients.forEach(c => {
      c.isActive = true;
      c.errorCount = 0;
    });
    return geminiClients[0];
  }
  
  // Round-robin selection
  const client = activeClients[currentKeyIndex % activeClients.length];
  currentKeyIndex = (currentKeyIndex + 1) % activeClients.length;
  
  return client;
}

// Mark a client as failed (temporarily disable for quota/rate limit errors)
function markClientFailed(client, error) {
  const errorMessage = error.message || '';
  
  // For quota/rate limit errors, disable for shorter time (2 minutes instead of 5)
  if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    client.isActive = false;
    client.lastError = errorMessage;
    client.errorCount++;
    console.warn(`⚠️ Key ${client.index + 1} (${client.key}) hit quota/rate limit. Disabling for 2 minutes.`);
    
    // Re-enable after 2 minutes (reduced from 5)
    setTimeout(() => {
      client.isActive = true;
      client.errorCount = 0;
      console.log(`✅ Key ${client.index + 1} (${client.key}) re-enabled after cooldown.`);
    }, 2 * 60 * 1000); // 2 minutes (reduced from 5)
  } else {
    // For other errors, just increment count
    client.errorCount++;
    if (client.errorCount >= 3) {
      client.isActive = false;
      console.warn(`⚠️ Key ${client.index + 1} (${client.key}) disabled after ${client.errorCount} errors.`);
      
      // Re-enable after 30 seconds for non-quota errors (reduced from 1 minute)
      setTimeout(() => {
        client.isActive = true;
        client.errorCount = 0;
        console.log(`✅ Key ${client.index + 1} (${client.key}) re-enabled after cooldown.`);
      }, 30 * 1000); // 30 seconds (reduced from 1 minute)
    }
  }
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

// Retry function with fast failure for quota errors
async function retryWithBackoff(fn, maxRetries = 2, initialDelay = 500) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      // Check if it's a rate limit error (429) or quota error
      const errorMessage = error.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        // For quota errors, don't wait - fail fast and try next key
        throw error; // Don't retry, let the system try next key immediately
      } else {
        // Quick retry for other errors (network issues, etc.)
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Call Gemini API with shorter timeout and fast failure
async function callGeminiAPI(model, messageWithContext, chatHistory, timeoutMs = 15000) {
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
    }, 1), // Only 1 retry for non-quota errors
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

    // If no Gemini clients are available, return a helpful message
    if (geminiClients.length === 0) {
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
    let lastError = null;
    let quotaErrors = 0; // Track how many keys hit quota

    // Try each available Gemini client until one works (max 3 attempts for speed)
    const maxAttempts = Math.min(geminiClients.length, 3); // Try max 3 keys before giving up
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const geminiClient = getNextGeminiClient();
      
      if (!geminiClient) {
        console.error('❌ No available Gemini clients');
        break;
      }
      
      try {
        // Ensure we use 1.5-flash, not 2.5-flash (which may not exist or have different limits)
        let modelToUse = geminiModelName || 'gemini-1.5-flash';
        // Force 1.5-flash if somehow 2.5 got set
        if (modelToUse.includes('2.5')) {
          console.warn('⚠️ Detected 2.5 model, switching to 1.5-flash');
          modelToUse = 'gemini-1.5-flash';
        }
        
        console.log(`🤖 Using Gemini key ${geminiClient.index + 1} (${geminiClient.key})`);
        const model = geminiClient.client.getGenerativeModel({ model: modelToUse });
      
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
        console.log(`✅ Received response from Gemini key ${geminiClient.index + 1} in ${responseTime}ms`);
        
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
        
        // Success! Return response
        return res.json({
          message: aiResponse,
          isEmergency: false
        });
        
      } catch (geminiError) {
        console.error(`❌ Gemini API error with key ${geminiClient.index + 1}:`, geminiError.message);
        lastError = geminiError;
        
        const errorMessage = geminiError.message || '';
        
        // Check if it's a quota error
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          quotaErrors++;
          markClientFailed(geminiClient, geminiError);
          
          // If all keys hit quota, fail fast
          if (quotaErrors >= maxAttempts) {
            console.error('❌ All attempted keys hit quota. Failing fast.');
            break;
          }
        } else {
          // For non-quota errors, mark as failed but continue
          markClientFailed(geminiClient, geminiError);
        }
        
        // Try next key if available (but don't wait long)
        if (attempt < maxAttempts - 1) {
          console.log(`⚠️ Trying next available key...`);
          // Small delay to avoid hammering keys
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
      }
    }
    
    // All keys failed, return error message quickly
    if (lastError) {
      const errorMessage = lastError.message || 'Unknown error';
      let userMessage = 'I\'m experiencing some technical difficulties with the AI service. ';
      
      // Check for specific error types
      if (errorMessage.includes('timeout')) {
        userMessage += 'The request took too long. Please try again with a shorter message.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        // Extract retry time if available
        const retryAfterMatch = errorMessage.match(/retry in ([\d.]+)s/i);
        if (retryAfterMatch) {
          const retrySeconds = Math.ceil(parseFloat(retryAfterMatch[1]));
          userMessage += `All API keys have reached their usage limits. Please wait about ${retrySeconds} seconds and try again.`;
        } else {
          userMessage += 'All API keys have reached their usage limits for now. Please wait a few minutes and try again.';
        }
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
    
    // Fallback if no error but no response
    return res.json({
      message: 'I\'m experiencing some technical difficulties. Please try again in a moment.',
      isEmergency: false
    });
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
