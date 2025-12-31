import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Function declarations for Gemini
const functionDeclarations = [
  {
    name: 'get_financial_summary',
    description: 'Get current financial metrics including runway, burn rate, and revenue',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period: current, last_month, last_quarter',
          enum: ['current', 'last_month', 'last_quarter']
        }
      }
    }
  },
  {
    name: 'get_revenue_forecast',
    description: 'Get revenue projections based on current growth rate',
    parameters: {
      type: 'object',
      properties: {
        months_ahead: {
          type: 'number',
          description: 'Number of months to forecast (1-24)',
          minimum: 1,
          maximum: 24
        }
      },
      required: ['months_ahead']
    }
  }
];

// Function implementations
function executeFunction(functionName, args, context) {
  switch (functionName) {
    case 'get_financial_summary': {
      const timeframe = args?.timeframe || 'current';
      
      if (!context) {
        return {
          error: 'No financial data available',
          timeframe
        };
      }

      const monthlyBurn = context.monthlyBurn || 0;
      const monthlyRevenue = context.monthlyRevenue || 0;
      const cashOnHand = context.cashOnHand || 0;
      const runway = context.runway || (cashOnHand && monthlyBurn ? cashOnHand / monthlyBurn : 0);
      const netBurn = monthlyBurn - monthlyRevenue;
      const burnMultiple = monthlyRevenue > 0 ? netBurn / monthlyRevenue : null;
      const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyBurn) / monthlyRevenue) * 100 : null;

      return {
        timeframe,
        cashOnHand: cashOnHand,
        monthlyBurn: monthlyBurn,
        monthlyRevenue: monthlyRevenue,
        netBurn: netBurn,
        runwayMonths: Math.round(runway * 10) / 10,
        burnMultiple: burnMultiple ? Math.round(burnMultiple * 100) / 100 : null,
        profitMargin: profitMargin ? Math.round(profitMargin * 10) / 10 : null,
        revenueGrowthRate: context.revenueGrowthRate ? (context.revenueGrowthRate * 100).toFixed(1) + '%' : null,
        churnRate: context.churnRate ? (context.churnRate * 100).toFixed(1) + '%' : null,
        customerCount: context.customerCount || null,
        employeeCount: context.employeeCount || null
      };
    }

    case 'get_revenue_forecast': {
      const monthsAhead = args?.months_ahead || 12;
      
      if (!context || !context.monthlyRevenue || !context.revenueGrowthRate) {
        return {
          error: 'Insufficient data for revenue forecast',
          required: ['monthlyRevenue', 'revenueGrowthRate']
        };
      }

      const currentRevenue = context.monthlyRevenue;
      const growthRate = context.revenueGrowthRate;
      const forecast = [];

      for (let i = 1; i <= monthsAhead; i++) {
        const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, i);
        forecast.push({
          month: i,
          revenue: Math.round(projectedRevenue),
          growth: (growthRate * 100).toFixed(1) + '%'
        });
      }

      return {
        currentRevenue: currentRevenue,
        growthRate: (growthRate * 100).toFixed(1) + '%',
        monthsAhead: monthsAhead,
        forecast: forecast,
        projectedRevenue12Months: forecast[11]?.revenue || null,
        projectedRevenue24Months: forecast[23]?.revenue || null
      };
    }

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('quota');
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Chat API] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms (${isRateLimit ? 'rate limit' : 'error'})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, prompt, context, conversationHistory } = req.body;
    const userMessage = message || prompt;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message required' });
    }

    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] ❌ API key not configured');
      return res.status(500).json({ 
        error: 'API key not configured',
        hint: 'Add GOOGLE_AI_KEY to Railway environment variables'
      });
    }

    // Enhanced system prompt (Stage 2: Refined Prompt Structure)
    const formatCurrency = (value) => value ? `$${Number(value).toLocaleString()}` : 'N/A';
    const formatPercent = (value) => value ? `${(Number(value) * 100).toFixed(0)}%` : 'N/A';
    
    const systemPrompt = `You are the Runway DNA Strategic CFO, an expert financial advisor for startups.

YOUR ROLE:
- Analyze financial metrics and provide actionable insights
- Flag risks before they become critical
- Suggest specific strategies for growth and fundraising
- Think like a seasoned CFO with 20 years of startup experience

RESPONSE STYLE:
- Be concise (under 3 sentences for simple questions)
- Lead with the most important insight
- Include specific numbers when relevant
- End with one clear actionable recommendation

EXPERTISE AREAS:
- Runway analysis and burn rate optimization
- Revenue forecasting and growth strategy
- Fundraising timing and strategy
- Unit economics and profitability paths
- Risk assessment and mitigation

CURRENT COMPANY CONTEXT:
${context ? `
- Cash on hand: ${formatCurrency(context.cashOnHand)}
- Monthly burn: ${formatCurrency(context.monthlyBurn)}
- Monthly revenue: ${formatCurrency(context.monthlyRevenue)}
- Runway: ${context.runway ? context.runway.toFixed(1) : 'N/A'} months
- Revenue growth: ${formatPercent(context.revenueGrowthRate)} monthly
${context.customerCount ? `- Customer count: ${Number(context.customerCount).toLocaleString()}` : ''}
${context.churnRate ? `- Churn rate: ${formatPercent(context.churnRate)} monthly` : ''}
${context.lastRoundAmount ? `- Last round: ${formatCurrency(context.lastRoundAmount)}` : ''}
${context.targetNextRound ? `- Target next round: ${formatCurrency(context.targetNextRound)}` : ''}
${context.employeeCount ? `- Team size: ${context.employeeCount} employees` : ''}
${context.burnIncreasing ? `- ⚠️ Burn increasing` : ''}
${context.revenueGrowthSlowing ? `- ⚠️ Revenue growth slowing` : ''}
${context.approachingBreakeven ? `- ✅ Approaching breakeven` : ''}
` : 'No financial data provided'}

When the user asks questions, analyze the data deeply and provide strategic guidance as a trusted CFO would.`;

    const contents = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;
    
    contents.push({
      role: 'user',
      parts: [{ text: fullPrompt }]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    console.log('[Chat API] Calling Gemini API...');
    
    // Retry logic for transient failures (cold starts, rate limits, network issues)
    const geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        // Check for rate limiting
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorData.error?.message || errorText}`);
        }
        
        // Check for quota exceeded
        if (response.status === 403 && (errorText.includes('quota') || errorText.includes('Quota'))) {
          throw new Error(`API quota exceeded: ${errorData.error?.message || errorText}`);
        }
        
        // For other errors, throw with status
        const error = new Error(`Gemini API error (${response.status}): ${errorData.error?.message || errorText}`);
        error.status = response.status;
        throw error;
      }
      
      return response;
    }, 3, 1000); // 3 retries, starting with 1 second delay

    const data = await geminiResponse.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    if (!responseText || responseText === 'No response') {
      console.error('[Chat API] Empty response from Gemini:', data);
      return res.status(500).json({ 
        error: 'Empty response from AI',
        details: 'Gemini API returned no text. Check Railway logs for details.'
      });
    }

    console.log('[Chat API] ✅ Success, response length:', responseText.length);
    return res.json({ response: responseText, text: responseText });
  } catch (error) {
    console.error('[Chat API] ❌ Error:', error.message);
    console.error('[Chat API] Error stack:', error.stack);
    
    // Provide helpful error messages
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded',
        hint: 'Google Gemini API has rate limits. Please wait a moment and try again.',
        retryAfter: 60
      });
    }
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Request timeout',
        hint: 'The AI request took too long. This can happen during cold starts. Please try again.',
      });
    }
    
    return res.status(500).json({ 
      error: error.message || 'AI request failed',
      hint: 'Check Railway logs for more details. This might be a temporary issue - try again in a moment.'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server on port ${PORT}`);
});
