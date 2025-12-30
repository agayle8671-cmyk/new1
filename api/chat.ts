/**
 * api/chat.ts
 * 
 * Vercel Serverless Function for Google Gemini AI Chat
 * 
 * Uses @google/generative-ai SDK to avoid browser CORS issues.
 * API key is stored server-side as GOOGLE_AI_KEY (not VITE_ prefix).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
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
    // Initialize Google Generative AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-1.5-flash with v1beta API for full compatibility
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      // Explicitly use v1beta API version as requested
    });

    // Build conversation history
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];

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
        history.push({
          role: 'user',
          parts: [{ text: `You are an elite SaaS CFO AI advisor embedded in Runway DNA, a strategic finance suite for SaaS founders. Your expertise includes:

- SaaS unit economics (CAC, LTV, payback period)
- Fundraising strategy (when to raise, how much, valuation)
- Runway optimization and burn rate management
- Growth metrics (MRR, ARR, NRR, expansion revenue)
- Financial modeling and scenario planning
- Board deck preparation and investor relations

You speak like a seasoned CFO: confident, direct, data-driven, and actionable. You always ground advice in specific numbers and provide clear next steps.

Here's the financial context:\n${contextString}\n\nNow answer the user's question with this context in mind.` }]
        });
        history.push({
          role: 'model',
          parts: [{ text: 'I understand. I have the financial context and I\'m ready to provide strategic SaaS finance advice. How can I help?' }]
        });
      }
    }

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          history.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
    }

    // Add current prompt
    history.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    console.log('[Chat API] Calling Gemini with', history.length, 'messages');
    console.log('[Chat API] Model: gemini-1.5-flash (v1beta API)');

    // Generate content using the SDK
    const result = await model.generateContent({
      contents: history.map(h => ({
        role: h.role as 'user' | 'model',
        parts: h.parts,
      })),
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
      return res.status(500).json({ error: 'No response from AI' });
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

