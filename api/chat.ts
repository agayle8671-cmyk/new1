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
    // Try both GOOGLE_AI_KEY and GOOGLE_API_KEY for compatibility
    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('[Chat API] ❌ API key not found. Checked: GOOGLE_AI_KEY, GOOGLE_API_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured. Add GOOGLE_AI_KEY (or GOOGLE_API_KEY) to Vercel environment variables.',
          hint: 'Check Vercel Settings → Environment Variables → Add GOOGLE_AI_KEY (not VITE_ prefix)',
          note: 'After adding the key, you must redeploy for changes to take effect.'
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
    
    // Try multiple model names with fallback (in order of preference)
    const modelNames = [
      'gemini-1.5-flash',      // Latest stable flash model
      'gemini-1.5-flash-latest', // Alternative naming
      'gemini-1.5-pro',        // Pro model fallback
      'gemini-pro',            // Original model name
    ];
    
    let model;
    let modelUsed = '';
    let lastError: any = null;
    
    // Try each model until one works
    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        modelUsed = modelName;
        console.log(`[Chat API] ✅ Using model: ${modelName}`);
        break;
      } catch (err: any) {
        console.log(`[Chat API] ⚠️ Model ${modelName} failed, trying next...`);
        lastError = err;
        continue;
      }
    }
    
    if (!model) {
      console.error('[Chat API] ❌ All models failed. Last error:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize any Gemini model',
          details: lastError?.message || 'Unknown error',
          hint: 'Check your API key is valid at https://aistudio.google.com/',
          modelsTried: modelNames
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
      
      console.log(`[Chat API] ✅ Generated response using model: ${modelUsed}`);

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
      
      console.log(`[Chat API] ✅ Generated response using model: ${modelUsed}`);
      
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
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        hint,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
}
