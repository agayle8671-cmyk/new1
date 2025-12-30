/**
 * api/chat.ts
 * 
 * Vercel Edge Serverless Function for Google Gemini AI Chat
 * 
 * Uses direct REST API (not SDK) for Edge runtime compatibility.
 * API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix).
 */

export const config = {
  runtime: 'edge',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message?: string;
  prompt?: string;
  context?: any;
  conversationHistory?: Message[];
}

export default async function handler(req: Request) {
  // CORS preflight
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const userMessage = body.message || body.prompt;

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

    // Get API key
    const apiKey =
      process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('[Chat API] ❌ API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          hint: 'Add GOOGLE_AI_KEY to Vercel environment variables and redeploy'
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

    // System prompt - Strategic CFO persona
    const systemPrompt =
      'You are the Runway DNA Strategic CFO. Analyze the provided financial data and give a short, actionable strategic insight. Keep it under 3 sentences.';

    // Build contents array for API
    const contents: any[] = [];

    // Add conversation history if present
    if (
      body.conversationHistory &&
      Array.isArray(body.conversationHistory) &&
      body.conversationHistory.length > 0
    ) {
      for (const msg of body.conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user message with context
    let fullPrompt = `${systemPrompt}\n\n`;
    if (body.context) {
      fullPrompt += `Context: ${JSON.stringify(body.context)}\n\n`;
    }
    fullPrompt += `User Question: ${userMessage}`;

    contents.push({
      role: 'user',
      parts: [{ text: fullPrompt }],
    });

    // Use the correct model name and API endpoint (v1 stable API)
    const model = 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    console.log('[Chat API] Calling Gemini REST API:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    console.log('[Chat API] Contents count:', contents.length);

    // Make request to Gemini API
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error('[Chat API] ❌ Gemini API error:', errorData);
      console.error('[Chat API] Status:', geminiResponse.status);

      return new Response(
        JSON.stringify({
          error: 'Failed to get response from AI',
          details: errorData.error?.message || errorData.error || errorText,
          status: geminiResponse.status,
          hint: geminiResponse.status === 404 
            ? 'Model may not be available. Check available models at https://aistudio.google.com/'
            : geminiResponse.status === 401 || geminiResponse.status === 403
            ? 'API key may be invalid. Verify at https://aistudio.google.com/'
            : 'Check Vercel function logs for more details'
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

    const data = await geminiResponse.json();

    // Extract text from response
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated';

    if (!responseText || responseText === 'No response generated') {
      console.error('[Chat API] ❌ No text in response');
      console.error('[Chat API] Response data:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({
          error: 'No response generated from AI',
          details: data,
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

    console.log('[Chat API] ✅ Success, response length:', responseText.length);

    return new Response(
      JSON.stringify({
        response: responseText,
        text: responseText,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('[Chat API] ❌ Exception:', error);
    console.error('[Chat API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200),
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        hint: 'Check Vercel function logs for detailed error information',
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
