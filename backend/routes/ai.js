const express = require('express');
const OpenAI = require('openai');
require('dotenv').config();
const pool = require('../config/database');
const { authenticate, requireStudent } = require('../middleware/auth');
const router = express.Router();

// Initialize AI providers
// Try to use Gemini first if available, otherwise fall back to OpenAI
let gemini = null;
let openai = null;

// Initialize Gemini if API key is available
console.log('🔍 Checking for GEMINI_API_KEY...', process.env.GEMINI_API_KEY ? 'Found' : 'Not found');
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized with key:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
  } catch (error) {
    console.error('❌ Gemini initialization error:', error.message);
    console.warn('⚠️ Gemini package not installed. Install with: npm install @google/generative-ai');
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables');
}

// Initialize OpenAI if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI initialized');
}

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

// AI Chat endpoint
router.post('/chat', authenticate, requireStudent, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Check for risk keywords
    const hasRiskKeywords = detectRiskKeywords(message);

    if (hasRiskKeywords) {
      // Create emergency flag
      await pool.query(
        `INSERT INTO emergency_flags (user_id, flag_type, severity, context)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'ai_keyword', 'critical', `Risk keywords detected in AI chat: ${message.substring(0, 200)}`]
      );

      // Return emergency response
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

    // If no AI provider is available, return a basic response
    if (!gemini && !openai) {
      return res.json({
        message: 'I\'m here to listen and support you. While I\'m not a replacement for professional help, I can help you explore your feelings. Would you like to access our resource hub or speak with a counselor?',
        isEmergency: false
      });
    }

    // Get user's latest screening results for context
    const screeningResult = await pool.query(
      `SELECT test_type, score, severity FROM screening_results 
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let contextPrompt = 'You are a supportive, empathetic AI assistant for a mental health platform. ';
    contextPrompt += 'You provide psychological first aid and emotional support. ';
    contextPrompt += 'You are NOT a medical professional and should not provide diagnoses or medical advice. ';
    contextPrompt += 'If users express serious concerns, encourage them to seek professional help. ';
    contextPrompt += 'Keep responses brief, warm, and supportive. ';

    if (screeningResult.rows.length > 0) {
      const latest = screeningResult.rows[0];
      contextPrompt += `The user recently completed a ${latest.test_type} screening with a ${latest.severity} severity score (${latest.score}). `;
    }

    try {
      let aiResponse;

      // Prefer Gemini if available, otherwise use OpenAI
      if (gemini) {
        try {
          console.log('🤖 Attempting to use Gemini API...');
          // Use gemini-1.5-flash (faster) or gemini-1.5-pro (more capable)
          const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
          console.log('✅ Gemini model loaded: gemini-1.5-flash');
          
          // Build conversation history for Gemini
          const chatHistory = [];
          
          // Add conversation history if provided (exclude the initial greeting)
          if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 1) {
            // Skip the first message (greeting) and get last 8 messages (4 exchanges)
            const recentHistory = conversationHistory.slice(1, -1).slice(-8);
            for (const msg of recentHistory) {
              if (msg.role === 'user' || msg.role === 'assistant') {
                chatHistory.push({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.content }]
                });
              }
            }
          }
          
          // Start chat session with history
          const chat = chatHistory.length > 0 
            ? model.startChat({ history: chatHistory })
            : model.startChat();
          
          // Combine context and message for simpler approach
          const fullPrompt = `${contextPrompt}\n\nUser: ${message}\nAssistant:`;
          
          console.log('📤 Sending message to Gemini...');
          // Send the message (use sendMessage with just the message text, not fullPrompt in history mode)
          const result = await chat.sendMessage(message);
          aiResponse = result.response.text();
          console.log('✅ Received response from Gemini, length:', aiResponse?.length || 0);
        } catch (geminiError) {
          console.error('❌ Gemini API error:', geminiError);
          console.error('❌ Gemini API error details:', JSON.stringify(geminiError, null, 2));
          // Fall back to OpenAI if available, otherwise return error message
          if (openai) {
            console.log('⚠️ Falling back to OpenAI due to Gemini error');
          } else {
            // Return a helpful error message instead of crashing
            return res.json({
              message: 'I\'m experiencing some technical difficulties with the AI service. Please try again in a moment, or contact support if the issue persists.',
              isEmergency: false
            });
          }
        }
      } else if (openai) {
        // Build messages array with conversation history
        const messages = [
          {
            role: 'system',
            content: contextPrompt
          }
        ];

        // Add conversation history if provided
        if (conversationHistory && Array.isArray(conversationHistory)) {
          // Add last 10 messages for context (5 exchanges)
          const recentHistory = conversationHistory.slice(-10);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({
                role: msg.role,
                content: msg.content
              });
            }
          }
        }

        // Add current message
        messages.push({
          role: 'user',
          content: message
        });

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        });
        aiResponse = completion.choices[0].message.content;
      }

      res.json({
        message: aiResponse,
        isEmergency: false
      });
    } catch (aiError) {
      console.error('AI API error:', aiError);
      res.json({
        message: 'I\'m here to support you. While I\'m having some technical difficulties, please know that help is available. Would you like to access our resource hub or speak with a counselor?',
        isEmergency: false
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Failed to process chat message' });
  }
});

module.exports = router;
