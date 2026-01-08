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

// Multi-key Gemini AI provider system with Gemma model rotation
let geminiClients = []; // Array of { client, key, isActive, lastError, currentModelIndex }
let gemmaModels = []; // Will be populated dynamically from available models
let currentKeyIndex = 0; // Round-robin index
let modelsInitialized = false;

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

// Discover available Gemma models dynamically
async function discoverAvailableGemmaModels() {
  if (geminiClients.length === 0) {
    console.warn('⚠️ No clients available to discover models');
    return;
  }
  
  try {
    console.log('🔍 Discovering available Gemma models...');
    const availableModels = await listAvailableGeminiModels(geminiClients[0].fullKey);
    
    // Filter for Gemma models (case-insensitive)
    const gemmaModelList = availableModels.filter(m => 
      m.toLowerCase().includes('gemma') && 
      !m.toLowerCase().includes('embedding') // Exclude embedding models
    );
    
    if (gemmaModelList.length > 0) {
      gemmaModels = gemmaModelList;
      console.log(`✅ Found ${gemmaModels.length} Gemma models: ${gemmaModels.join(', ')}`);
      console.log(`✅ Total capacity per API key: ${gemmaModels.length * 14400} requests/day`);
    } else {
      // Fallback to Gemini Flash models if no Gemma models found
      console.warn('⚠️ No Gemma models found. Falling back to Gemini Flash models.');
      gemmaModels = availableModels.filter(m => 
        m.toLowerCase().includes('flash') && 
        !m.toLowerCase().includes('2.5') && // Avoid 2.5 models
        !m.toLowerCase().includes('tts') &&
        !m.toLowerCase().includes('native-audio')
      );
      
      if (gemmaModels.length === 0) {
        // Last resort: use any available model
        gemmaModels = availableModels.slice(0, 5); // Take first 5 available
        console.warn(`⚠️ Using first 5 available models: ${gemmaModels.join(', ')}`);
      } else {
        console.log(`✅ Using Gemini Flash models: ${gemmaModels.join(', ')}`);
      }
    }
    
    modelsInitialized = true;
    console.log(`✅ Multi-key system ready with ${geminiClients.length} active key(s) and ${gemmaModels.length} model(s)`);
  } catch (error) {
    console.error('❌ Failed to discover models:', error.message);
    // Fallback to default Gemini Flash
    gemmaModels = ['gemini-1.5-flash'];
    modelsInitialized = true;
    console.warn('⚠️ Using fallback model: gemini-1.5-flash');
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
  
  // Initialize each client with model rotation
  geminiClients.forEach(client => {
    client.currentModelIndex = 0; // Start with first model
    client.modelFailures = {}; // Track failures per model
  });
  
  // Dynamically discover available Gemma models
  discoverAvailableGemmaModels();
}

// Initialize Gemini keys
try {
  initializeGeminiKeys();
} catch (error) {
  console.error('❌ Gemini initialization error:', error.message);
  console.warn('⚠️ Gemini package not installed. Install with: npm install @google/generative-ai');
}

// Get next available Gemini client with model rotation
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
      c.currentModelIndex = 0;
      c.modelFailures = {};
    });
    return geminiClients[0];
  }
  
  // Round-robin selection
  const client = activeClients[currentKeyIndex % activeClients.length];
  currentKeyIndex = (currentKeyIndex + 1) % activeClients.length;
  
  return client;
}

// Get next available model for a client (Gemma or fallback)
function getNextGemmaModel(client) {
  // Wait for models to be initialized
  if (!modelsInitialized || gemmaModels.length === 0) {
    // Fallback to default if not initialized
    return 'gemini-1.5-flash';
  }
  
  // Try models in rotation, skipping ones that have failed recently
  const maxAttempts = gemmaModels.length;
  
  for (let i = 0; i < maxAttempts; i++) {
    const modelIndex = (client.currentModelIndex + i) % gemmaModels.length;
    const modelName = gemmaModels[modelIndex];
    
    // Skip models that have failed recently (within last 5 minutes)
    const failureTime = client.modelFailures[modelName];
    if (failureTime && Date.now() - failureTime < 5 * 60 * 1000) {
      continue; // Skip this model, try next
    }
    
    // Found an available model
    client.currentModelIndex = (modelIndex + 1) % gemmaModels.length; // Advance for next time
    return modelName;
  }
  
  // All models failed, reset and try first one
  client.modelFailures = {};
  client.currentModelIndex = 1;
  return gemmaModels[0];
}

// Mark a Gemma model as failed
function markModelFailed(client, modelName) {
  client.modelFailures[modelName] = Date.now();
  console.warn(`⚠️ Model ${modelName} failed for key ${client.index + 1}. Will skip for 5 minutes.`);
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

// Call Gemini API with timeout and therapist-style configuration
async function callGeminiAPI(model, messageWithContext, chatHistory, timeoutMs = 20000) {
  return Promise.race([
    retryWithBackoff(async () => {
      const chat = chatHistory.length > 0 
        ? model.startChat({ history: chatHistory })
        : model.startChat();
      
      const result = await chat.sendMessage(messageWithContext, {
        generationConfig: {
          maxOutputTokens: 150, // Natural, concise responses
          temperature: 0.7, // Balanced naturalness
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

    // Build natural, supportive context prompt
    let contextPrompt = 'You are a supportive, empathetic AI assistant for a mental health platform. ';
    contextPrompt += 'Respond naturally and conversationally, like a caring friend who listens well. ';
    contextPrompt += 'Keep responses brief and genuine. If users express serious concerns about self-harm or suicide, encourage them to seek professional help immediately. ';

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

    // Try each available Gemini client with Gemma model rotation
    const maxKeyAttempts = Math.min(geminiClients.length, 3); // Try max 3 keys before giving up
    for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
      const geminiClient = getNextGeminiClient();
      
      if (!geminiClient) {
        console.error('❌ No available Gemini clients');
        break;
      }
      
      // Try all 5 Gemma models for this key before moving to next key
      const maxModelAttempts = gemmaModels.length;
      let modelSuccess = false;
      
      for (let modelAttempt = 0; modelAttempt < maxModelAttempts; modelAttempt++) {
        const modelToUse = getNextGemmaModel(geminiClient);
        
        try {
          console.log(`🤖 Using key ${geminiClient.index + 1} (${geminiClient.key}) with model ${modelToUse}`);
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
          
          console.log('📤 Sending message to Gemma model...');
          const startTime = Date.now();
          
          aiResponse = await callGeminiAPI(model, messageWithContext, chatHistory);
          
          const responseTime = Date.now() - startTime;
          console.log(`✅ Received response from key ${geminiClient.index + 1} model ${modelToUse} in ${responseTime}ms`);
          
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
          modelSuccess = true;
          return res.json({
            message: aiResponse,
            isEmergency: false
          });
          
        } catch (modelError) {
          console.error(`❌ Model ${modelToUse} error with key ${geminiClient.index + 1}:`, modelError.message);
          lastError = modelError;
          
          const errorMessage = modelError.message || '';
          
          // Mark this model as failed
          markModelFailed(geminiClient, modelToUse);
          
          // Check if it's a quota error for this model
          if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            // This model hit quota, try next model
            console.log(`⚠️ Model ${modelToUse} hit quota. Trying next Gemma model...`);
            continue; // Try next model
          } else {
            // For other errors (timeout, etc.), try next model quickly
            console.log(`⚠️ Model ${modelToUse} failed. Trying next Gemma model...`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            continue; // Try next model
          }
        }
      }
      
      // All models for this key failed
      if (!modelSuccess) {
        console.warn(`⚠️ All Gemma models exhausted for key ${geminiClient.index + 1}. Moving to next API key...`);
        quotaErrors++;
        markClientFailed(geminiClient, lastError);
        
        // If all keys exhausted, fail fast
        if (quotaErrors >= maxKeyAttempts) {
          console.error('❌ All attempted keys and models exhausted. Failing fast.');
          break;
        }
        
        // Try next key
        if (keyAttempt < maxKeyAttempts - 1) {
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
