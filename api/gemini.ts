/**
 * Vercel Serverless Function for Gemini API
 * 
 * This proxies requests to Google Gemini API to:
 * 1. Keep API key secure (server-side only)
 * 2. Avoid CORS issues
 * 3. Follow best practices
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable
  const apiKey = process.env.GOOGLE_AI_KEY;
  
  console.log('[Gemini API] Request received');
  console.log('[Gemini API] API key configured:', apiKey ? 'Yes' : 'No');
  
  if (!apiKey) {
    console.error('[Gemini API] GOOGLE_AI_KEY not configured');
    return res.status(500).json({ 
      error: 'API key not configured. Add GOOGLE_AI_KEY to Vercel environment variables.',
      hint: 'Check Vercel Settings → Environment Variables → Add GOOGLE_AI_KEY'
    });
  }

  // Get request body
  const { prompt, context, conversationHistory } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Build the Gemini API request
    const contents = [];
    
    // Add system context if provided
    if (context) {
      let contextString = '';
      if (context.analysis) {
        const a = context.analysis;
        contextString += `
CURRENT FINANCIAL DATA:
- Monthly Revenue: $${a.monthlyRevenue?.toLocaleString() || 'N/A'}
- Monthly Burn: $${a.monthlyBurn?.toLocaleString() || 'N/A'}
- Cash on Hand: $${a.cashOnHand?.toLocaleString() || 'N/A'}
- Runway: ${a.runwayMonths?.toFixed(1) || 'N/A'} months
- Grade: ${a.grade || 'N/A'}
- Revenue Growth: ${((a.revenueGrowth || 0) * 100).toFixed(1)}%
- Expense Growth: ${((a.expenseGrowth || 0) * 100).toFixed(1)}%
- Profit Margin: ${((a.profitMargin || 0) * 100).toFixed(1)}%
- Burn Multiple: ${a.burnMultiple?.toFixed(2) || 'N/A'}
`;
      }
      if (context.simulatorParams) {
        const s = context.simulatorParams;
        contextString += `
SIMULATOR PARAMETERS:
- Projected Monthly Revenue: $${s.monthlyRevenue?.toLocaleString() || 'N/A'}
- Projected Monthly Expenses: $${s.monthlyExpenses?.toLocaleString() || 'N/A'}
- Revenue Growth Rate: ${((s.revenueGrowth || 0) * 100).toFixed(1)}%
- Expense Growth Rate: ${((s.expenseGrowth || 0) * 100).toFixed(1)}%
`;
      }
      
      if (contextString) {
        contents.push({
          role: 'user',
          parts: [{ text: `You are an elite financial advisor AI. Here's the financial context:\n${contextString}\n\nNow answer the user's question.` }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand. I have the financial context. How can I help?' }]
        });
      }
    }

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // Call Gemini API
    // Available models in v1beta: gemini-1.5-pro, gemini-1.5-flash
    // gemini-pro is NOT available in v1beta, only in v1
    const model = 'gemini-1.5-pro'; // Use v1beta-compatible model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    console.log('[Gemini API] Calling:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(apiUrl, {
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

    if (!response.ok) {
      const error = await response.json();
      console.error('[Gemini API] Error:', error);
      return res.status(response.status).json({ 
        error: error.error?.message || 'Failed to get AI response',
        details: error
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    // Return the response
    return res.status(200).json({ text });
  } catch (error) {
    console.error('[Gemini API] Exception:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

