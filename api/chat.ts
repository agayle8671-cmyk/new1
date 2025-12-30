/**
 * api/chat.ts
 * 
 * Vercel Edge Serverless Function for Google Gemini AI Chat
 * 
 * Secure backend route using Google Generative AI SDK.
 * API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix).
 * Uses Edge runtime for better performance.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { 
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { message, context, prompt, conversationHistory } = await req.json();

    // Support both 'message' and 'prompt' for backward compatibility
    const userMessage = message || prompt;
    
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'Message or prompt is required' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get API key from environment variable (server-side only)
    const apiKey = process.env.GOOGLE_AI_KEY;
    
    if (!apiKey) {
      console.error('[Chat API] ❌ GOOGLE_AI_KEY not found');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured. Add GOOGLE_AI_KEY to Vercel environment variables.',
          hint: 'Check Vercel Settings → Environment Variables → Add GOOGLE_AI_KEY (not VITE_ prefix)'
        }), 
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Initialize on server-side only
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Use the provided context or default to a financial persona
    const systemPrompt = "You are the Runway DNA Strategic CFO. Analyze the provided financial data and give a short, actionable strategic insight. Keep it under 3 sentences.";

    // Build the prompt with context
    let fullPrompt = `${systemPrompt}\n\nContext: ${JSON.stringify(context || {})}\n\nUser Question: ${userMessage}`;

    // If conversation history exists, build a proper conversation
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Build conversation history for the model
      const history = conversationHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      // Add current message
      history.push({
        role: 'user',
        parts: [{ text: fullPrompt }]
      });

      const result = await model.generateContent({
        contents: history,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const response = result.response.text();
      return new Response(
        JSON.stringify({ response, text: response }), 
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    } else {
      // Simple single message
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();
      
      return new Response(
        JSON.stringify({ response, text: response }), 
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }
  } catch (error: any) {
    console.error('[Chat API] ❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
