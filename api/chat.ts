/**
 * api/chat.ts
 * 
 * Vercel Serverless Function for Google Gemini AI Chat
 * 
 * Secure backend route using REST API directly for maximum compatibility.
 * API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix).
 * Uses v1 stable API with gemini-1.5-flash and Strategic CFO persona.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Strategic CFO Persona - High-status financial advisor for SaaS founders
const STRATEGIC_CFO_PERSONA = `You are the Runway DNA Strategic CFO, a high-status financial advisor for SaaS founders. Your goal is to analyze financial genomes and provide actionable survival and growth strategies. Evaluate health based on: Grade A (>18 months runway), Grade B (6-18 months), or Grade C (<6 months). Use intellectual, direct, and empathetic Founder-to-Founder logic. Start with a high-level observation, provide a metric-based insight, and end with one "Next Move." Never give definitive legal advice.`;

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

  // Get API key from environment variable (server-side only)
  const apiKey = process.env.GOOGLE_AI_KEY;
  
  console.log('[Chat API] ========================================');
  console.log('[Chat API] Request received');
  console.log('[Chat API] API key configured:', apiKey ? `Yes (${apiKey.substring(0, 8)}...)` : 'No');
  
  if (!apiKey) {
    console.error('[Chat API] ❌ GOOGLE_AI_KEY not found in process.env');
    return res.status(500).json({ 
      error: 'API key not configured. Add GOOGLE_AI_KEY to Vercel environment variables.',
      hint: 'Check Vercel Settings → Environment Variables → Add GOOGLE_AI_KEY (not VITE_ prefix)'
    });
  }

  // Get request body
  const { prompt, context, conversationHistory } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string' });
  }

  try {
    // Build conversation history for REST API
    // Start with Strategic CFO persona as the first system message
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
      {
        role: 'user',
        parts: [{ text: STRATEGIC_CFO_PERSONA }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I am the Runway DNA Strategic CFO. I will analyze financial genomes and provide actionable survival and growth strategies using Founder-to-Founder logic. How can I help?' }]
      }
    ];

    // Add financial context if provided
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
      
      // Add context as first user message if available
      if (contextString) {
        contents.push({
          role: 'user',
          parts: [{ text: `Here's the current financial context:\n${contextString}\n\nUse this data to inform your analysis.` }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'I have the financial context. Ready to provide strategic CFO insights.' }]
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

    console.log('[Chat API] Calling Gemini REST API with', contents.length, 'messages');
    console.log('[Chat API] Model: gemini-1.5-flash (v1 API - stable)');
    console.log('[Chat API] Persona: Strategic CFO (Runway DNA)');

    // Call Gemini REST API directly using v1 (stable, proven to work)
    // Use gemini-1.5-flash which is stable and widely available
    const model = 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    
    console.log('[Chat API] API URL:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    // Build request body (Strategic CFO persona is embedded in conversation history)
    const requestBody: any = {
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
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      console.error('[Chat API] ❌ API Error:', errorData);
      console.error('[Chat API] Status:', response.status, response.statusText);
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('[Chat API] ❌ No text in response');
      console.error('[Chat API] Response data:', JSON.stringify(data, null, 2));
      return res.status(500).json({ 
        error: 'No response from AI', 
        details: data,
        hint: 'Check Vercel function logs for more details'
      });
    }

    console.log('[Chat API] ✅ Success, response length:', text.length);
    console.log('[Chat API] ========================================');

    // Return the response
    return res.status(200).json({ text });
  } catch (error) {
    console.error('[Chat API] ❌ Exception:', error);
    console.error('[Chat API] Error details:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error);
    console.error('[Chat API] ========================================');
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    });
  }
}
