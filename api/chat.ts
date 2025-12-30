/**
 * api/chat.ts
 * 
 * Vercel Serverless Function for Google Gemini AI Chat
 * 
 * Uses Google Generative AI SDK with Node.js runtime.
 * API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Strategic CFO Persona
const STRATEGIC_CFO_PERSONA = 'You are the Runway DNA Strategic CFO. Analyze the provided financial data and give a short, actionable strategic insight. Keep it under 3 sentences.';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, prompt, context, conversationHistory } = req.body;
    const userMessage = message || prompt;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message or prompt is required' });
    }

    // Get API key
    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('[Chat API] ❌ API key not configured');
      return res.status(500).json({
        error: 'API key not configured',
        hint: 'Add GOOGLE_AI_KEY to Vercel environment variables and redeploy',
      });
    }

    // Initialize Google Generative AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
    });

    console.log('[Chat API] ✅ Using Google SDK with gemini-1.5-flash');

    // Build conversation contents
    const contents: any[] = [];

    // Add conversation history if present
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    // Build prompt with context and Strategic CFO persona
    let fullPrompt = `${STRATEGIC_CFO_PERSONA}\n\n`;
    if (context) {
      fullPrompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    fullPrompt += `User Question: ${userMessage}`;

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: fullPrompt }],
    });

    console.log('[Chat API] Calling Gemini with', contents.length, 'messages');

    // Generate content using SDK
    const result = await model.generateContent({
      contents,
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

    const response = await result.response;
    const text = response.text();

    if (!text) {
      console.error('[Chat API] ❌ No text in response');
      return res.status(500).json({
        error: 'No response generated from AI',
      });
    }

    console.log('[Chat API] ✅ Success, response length:', text.length);

    return res.status(200).json({
      response: text,
      text: text,
    });
  } catch (error: any) {
    console.error('[Chat API] ❌ Error:', error);
    console.error('[Chat API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200),
    });

    // Provide helpful error messages
    let errorMessage = error.message || 'Unknown error';
    let hint = '';

    if (errorMessage.includes('API key') || errorMessage.includes('PERMISSION_DENIED')) {
      hint = 'Verify your API key is valid at https://aistudio.google.com/ and has the correct permissions.';
    } else if (errorMessage.includes('model') || errorMessage.includes('not found')) {
      hint = 'The model may not be available. Check available models at https://aistudio.google.com/';
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      hint = 'You may have exceeded your API quota. Check your usage at https://aistudio.google.com/';
    }

    return res.status(500).json({
      error: errorMessage,
      hint,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
