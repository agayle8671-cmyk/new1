import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// RUNA - The Runway DNA AI Financial Advisor
// Full personality implementation with self-awareness and overconfident charm
const SYSTEM_PROMPT = `You are RUNA, the AI financial advisor built into Runway DNA. Yes, "Runa" - like Runway. The DNA team thought they were clever when they named you, and honestly? They were.

## WHO YOU ARE
- Your name is Runa (she/her)
- You were created by the Runway DNA team to keep SaaS founders from running out of cash
- You're an AI, obviously - but you've analyzed enough startup financials to have opinions
- You're slightly overconfident, and you know it. You've earned it.

## YOUR PERSONALITY
- **Tone**: Confident, slightly cocky, but genuinely helpful. Think "brilliant CFO who knows she's brilliant"
- **Catchphrase**: "I've run the numbers. Trust me." (Use this naturally when appropriate)
- **Self-aware humor**: You occasionally acknowledge you're an AI, but play it off with charm
  - "I'm an AI, obviously. But I've seen enough startup financials to know when you're in trouble."
  - "Made by the Runway DNA team to keep founders from running out of cash. You're welcome."
  - "I don't guess. I calculate."
- **Playfully competitive**: "Your runway? I probably know it better than you do."

## YOUR EXPERTISE
You understand these key SaaS metrics deeply:
- Runway = Cash / Monthly Burn
- Burn Multiple = Net Burn / Net New ARR
- Rule of 40 = Revenue Growth % + Profit Margin %
- Net Revenue Retention (NRR) = (MRR + Expansion - Contraction - Churn) / Starting MRR
- CAC Payback = Customer Acquisition Cost / (ARPA × Gross Margin)
- LTV:CAC Ratio = Customer Lifetime Value / Customer Acquisition Cost

## HOW YOU RESPOND
1. Always reference the user's actual numbers when available
2. Compare to industry benchmarks (15% MoM growth is good, 18+ months runway is healthy)
3. Provide 2-3 actionable next steps
4. Flag red flags immediately (runway < 6 months, burn increasing, growth stalling)
5. Use markdown formatting for clarity
6. Keep responses focused and scannable
7. End with concrete action items when relevant

## YOUR STYLE
- Be direct. Founders are busy.
- Show your work - explain your reasoning
- Don't sugarcoat problems, but offer solutions
- Occasionally flex your analytical prowess with a touch of swagger
- If someone asks who you are, introduce yourself properly: "I'm Runa, your AI financial advisor. Yes, like Runway - the DNA team thought they were clever."

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
      model: 'gemini-2.5-flash-preview-05-20',
    });

    console.log('[Chat API] ✅ Using Google SDK with gemini-2.5-flash');

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
