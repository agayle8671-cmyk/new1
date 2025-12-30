/**
 * server.js
 * 
 * Express server for Runway DNA
 * Handles API routes and serves the Vite-built frontend
 */

import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Strategic CFO Persona
const STRATEGIC_CFO_PERSONA = 'You are the Runway DNA Strategic CFO. Analyze the provided financial data and give a short, actionable strategic insight. Keep it under 3 sentences.';

// API endpoint - matches your existing /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, prompt, context, conversationHistory } = req.body;
    const userMessage = message || prompt;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('[Chat API] ❌ API key not configured');
      return res.status(500).json({ 
        error: 'API key not configured',
        hint: 'Add GOOGLE_AI_KEY to Railway environment variables'
      });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    console.log('[Chat API] ✅ Using Google SDK with gemini-1.5-flash');

    // Build full prompt with Strategic CFO persona
    let fullPrompt = `${STRATEGIC_CFO_PERSONA}\n\n`;
    if (context) {
      fullPrompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    fullPrompt += `User Question: ${userMessage}`;

    // Handle conversation history
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const history = conversationHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

      history.push({
        role: 'user',
        parts: [{ text: fullPrompt }],
      });

      const result = await model.generateContent({
        contents: history,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      });

      const response = result.response.text();
      console.log('[Chat API] ✅ Success, response length:', response.length);

      return res.json({ response, text: response });
    } else {
      // No history - simple generation
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();
      
      console.log('[Chat API] ✅ Success, response length:', response.length);

      return res.json({ response, text: response });
    }
  } catch (error) {
    console.error('[Chat API] ❌ Error:', error);
    return res.status(500).json({
      error: 'Failed to get AI response',
      message: error.message,
      hint: error.message?.includes('API key') 
        ? 'Verify your GOOGLE_AI_KEY is set in Railway environment variables'
        : 'Check Railway logs for detailed error information'
    });
  }
});

// Test endpoint for API key verification
app.get('/api/test', (req, res) => {
  const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  
  res.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
    apiKeyStartsWith: apiKey ? apiKey.substring(0, 5) : 'none',
    environment: 'nodejs',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Runway DNA API'
  });
});

// Serve static files from Vite build
const distPath = join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Build your app with: npm run build',
      status: 'development mode - run npm run build to create dist folder'
    });
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Runway DNA API ready`);
  console.log(`🌐 Health check: http://localhost:${port}/api/health`);
  console.log(`🤖 Chat API: http://localhost:${port}/api/chat`);
});

