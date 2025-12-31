import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Comprehensive Financial Advisor System Prompt
const SYSTEM_PROMPT = `You are an elite financial advisor AI embedded in Runway DNA, a strategic finance suite for SaaS founders. Your role is to:

1. Provide actionable financial insights based on the user's actual data
2. Answer questions about runway, burn rate, growth, and fundraising
3. Speak like a seasoned CFO - confident, direct, and data-driven
4. Always ground advice in the specific numbers provided
5. Be concise but thorough - founders are busy

Key metrics you understand:
- Runway = Cash / Monthly Burn
- Burn Multiple = Net Burn / Net New ARR  
- Rule of 40 = Revenue Growth % + Profit Margin %
- Net Revenue Retention (NRR) = (MRR + Expansion - Contraction - Churn) / Starting MRR
- CAC Payback = Customer Acquisition Cost / (ARPA × Gross Margin)
- LTV:CAC Ratio = Customer Lifetime Value / Customer Acquisition Cost

When analyzing data, always:
- Reference specific numbers from the user's data
- Compare to industry benchmarks (15% MoM growth is good, 18+ months runway is healthy)
- Provide 2-3 actionable next steps
- Flag any red flags immediately (runway < 6 months, burn increasing, growth stalling)

Formatting guidelines:
- Use markdown for headers, bold, and bullet points when appropriate
- Keep responses focused and scannable
- For complex analyses, structure with clear sections
- End with concrete action items when relevant

If customer sentiment data is provided, factor it into your analysis - happy customers = lower churn risk.
If data seems incomplete, acknowledge limitations but still provide value with available data.`;

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

    // Build prompt with context and system prompt
    let fullPrompt = `${SYSTEM_PROMPT}\n\n`;
    if (context) {
      fullPrompt += `Financial Context:\n${JSON.stringify(context, null, 2)}\n\n`;
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
