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
  },
  {
    name: 'perform_analysis',
    description: 'Perform a specific type of financial analysis: runway, fundraising, growth, risk, or breakeven',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          description: 'Type of analysis to perform',
          enum: ['runway', 'fundraising', 'growth', 'risk', 'breakeven']
        }
      },
      required: ['analysis_type']
    }
  },
  {
    name: 'get_industry_benchmarks',
    description: 'Get B2B SaaS industry benchmarks for comparison (burn rate, growth, churn, Series A size)',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

// Helper function to get financial summary with caching
async function getFinancialSummary(timeframe, context) {
  // Create cache key based on timeframe and context data
  const contextHash = context ? JSON.stringify({
    cashOnHand: context.cashOnHand,
    monthlyBurn: context.monthlyBurn,
    monthlyRevenue: context.monthlyRevenue,
    revenueGrowthRate: context.revenueGrowthRate
  }) : 'no-context';
  const cacheKey = `summary_${timeframe}_${contextHash}`;
  
  // Check cache
  if (financialSummaryCache.has(cacheKey)) {
    console.log(`[Cache] Hit for ${cacheKey}`);
    return financialSummaryCache.get(cacheKey);
  }
  
  // Calculate summary
  if (!context) {
    const result = {
      error: 'No financial data available',
      timeframe
    };
    return result;
  }

  const monthlyBurn = context.monthlyBurn || 0;
  const monthlyRevenue = context.monthlyRevenue || 0;
  const cashOnHand = context.cashOnHand || 0;
  const runway = context.runway || (cashOnHand && monthlyBurn ? cashOnHand / monthlyBurn : 0);
  const netBurn = monthlyBurn - monthlyRevenue;
  const burnMultiple = monthlyRevenue > 0 ? netBurn / monthlyRevenue : null;
  const profitMargin = monthlyRevenue > 0 ? ((monthlyRevenue - monthlyBurn) / monthlyRevenue) * 100 : null;

  const result = {
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
  
  // Cache the result
  financialSummaryCache.set(cacheKey, result);
  console.log(`[Cache] Stored ${cacheKey}`);
  
  // Set TTL: delete after 60 seconds
  setTimeout(() => {
    financialSummaryCache.delete(cacheKey);
    console.log(`[Cache] Expired ${cacheKey}`);
  }, 60000);
  
  return result;
}

// Function implementations
function executeFunction(functionName, args, context) {
  switch (functionName) {
    case 'get_financial_summary': {
      const timeframe = args?.timeframe || 'current';
      // Use cached version
      return getFinancialSummary(timeframe, context);
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

    case 'perform_analysis': {
      const analysisType = args?.analysis_type;
      if (!analysisType) {
        return { error: 'analysis_type is required' };
      }

      const analysisPrompts = {
        runway: 'Analyze our cash runway and burn rate trajectory. Focus on: current runway, burn rate trends, cash consumption patterns, and runway extension strategies.',
        fundraising: 'Assess our fundraising readiness and timing. Focus on: current metrics vs. typical Series A requirements, growth trajectory, unit economics, and optimal fundraising timeline.',
        growth: 'Evaluate revenue growth and unit economics. Focus on: growth rate trends, customer acquisition costs, lifetime value, churn impact, and growth sustainability.',
        risk: 'Identify top financial risks we should address. Focus on: cash runway risks, burn rate acceleration, revenue growth slowdown, churn increases, and market risks.',
        breakeven: 'Calculate path to profitability. Focus on: current burn vs. revenue, growth rate needed, timeline to breakeven, and strategies to accelerate profitability.'
      };

      const prompt = analysisPrompts[analysisType];
      if (!prompt) {
        return { error: `Unknown analysis type: ${analysisType}. Valid types: runway, fundraising, growth, risk, breakeven` };
      }

      // Return the analysis prompt and context summary for the AI to use
      return {
        analysis_type: analysisType,
        prompt: prompt,
        context_summary: {
          cashOnHand: context?.cashOnHand || 'N/A',
          monthlyBurn: context?.monthlyBurn || 'N/A',
          monthlyRevenue: context?.monthlyRevenue || 'N/A',
          runway: context?.runway || 'N/A',
          revenueGrowthRate: context?.revenueGrowthRate || 'N/A',
          burnIncreasing: context?.burnIncreasing || false,
          revenueGrowthSlowing: context?.revenueGrowthSlowing || false,
          approachingBreakeven: context?.approachingBreakeven || false
        }
      };
    }

    case 'get_industry_benchmarks': {
      // Stage 6: Return industry benchmarks for comparison
      return {
        industry: 'B2B SaaS',
        typicalBurn: 75000,
        typicalGrowth: 0.15, // 15% MoM
        typicalChurn: 0.05, // 5% monthly
        seriesASizeAvg: 8000000, // $8M
        healthyBurnMultiple: 2, // < 2x
        idealRunwayMonths: '18-24 months',
        targetGrossMargin: '> 70%',
        goodNrr: '> 100%',
        notes: 'Use these benchmarks to compare company metrics and provide context on performance relative to industry standards'
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
    const { message, prompt, context, conversationHistory, stream } = req.body;
    const userMessage = message || prompt;
    const useStreaming = stream === true;

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

ANALYSIS TYPES AVAILABLE:
You can perform specific types of analysis using the perform_analysis function:
- runway: Analyze cash runway and burn rate trajectory
- fundraising: Assess fundraising readiness and timing
- growth: Evaluate revenue growth and unit economics
- risk: Identify top financial risks to address
- breakeven: Calculate path to profitability

When users ask for specific analysis types, use the perform_analysis function to get structured guidance.

INDUSTRY BENCHMARKS (B2B SaaS):
Use these benchmarks to compare the company's metrics:
- Typical monthly burn: $75,000 (for similar stage companies)
- Typical monthly growth: 15% MoM (month-over-month)
- Typical monthly churn: 5%
- Average Series A size: $8,000,000
- Healthy burn multiple: < 2x (net burn / net new ARR)
- Ideal runway: 18-24 months
- Target gross margin: > 70%
- Good NRR (Net Revenue Retention): > 100%

When analyzing metrics, always compare against these benchmarks and provide context on how the company measures up.

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

    // Stage 4: Use v1beta endpoint for function calling support
    // Stage 7: Support streaming with streamGenerateContent endpoint
    // Note: Function calling doesn't work with streaming, so disable streaming if functions are needed
    const endpoint = useStreaming ? 'streamGenerateContent' : 'generateContent';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:${endpoint}?key=${apiKey}`;
    
    console.log(`[Chat API] Calling Gemini API (${useStreaming ? 'streaming' : 'non-streaming'})...`);
    
    // Stage 4: Add function calling support
    // Stage 7: Note: Streaming and function calling are mutually exclusive
    let requestBody = {
      contents,
      tools: useStreaming ? undefined : [{ functionDeclarations }], // Disable tools for streaming
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };
    
    // Stage 7: Handle streaming response
    if (useStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        const geminiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000)
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          res.write(`data: ${JSON.stringify({ error: 'AI request failed', details: errorText })}\n\n`);
          res.end();
          return;
        }

        // Stream the response
        const reader = geminiResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON chunks
                console.warn('[Chat API] Invalid JSON chunk:', line);
              }
            }
          }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      } catch (error) {
        console.error('[Chat API] Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
        return;
      }
    }
    
    // Non-streaming response (with function calling support)
    // Retry logic for transient failures (cold starts, rate limits, network issues)
    let geminiResponse = await retryWithBackoff(async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

    let data = await geminiResponse.json();
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const functionCalls = data.candidates?.[0]?.content?.parts?.filter(part => part.functionCall);

    // Stage 4: Handle function calls
    if (functionCalls && functionCalls.length > 0) {
      console.log('[Chat API] Function calls detected:', functionCalls.map(fc => fc.functionCall.name));
      
      // Add the model's response with function calls to conversation
      contents.push({
        role: 'model',
        parts: data.candidates[0].content.parts
      });

      // Execute functions and add results
      for (const functionCall of functionCalls) {
        const functionName = functionCall.functionCall.name;
        const args = functionCall.functionCall.args; // args is already an object
        
        console.log(`[Chat API] Executing function: ${functionName} with args:`, args);
        
        const functionResult = executeFunction(functionName, args, context);
        
        console.log(`[Chat API] Function ${functionName} result:`, functionResult);
        
        // Add function result to conversation
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: functionName,
              response: functionResult
            }
          }]
        });
      }

      // Second API call with function results
      requestBody = {
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };

      console.log('[Chat API] Making second API call with function results...');
      geminiResponse = await retryWithBackoff(async () => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }
          
          if (response.status === 429) {
            throw new Error(`Rate limit exceeded: ${errorData.error?.message || errorText}`);
          }
          
          if (response.status === 403 && (errorText.includes('quota') || errorText.includes('Quota'))) {
            throw new Error(`API quota exceeded: ${errorData.error?.message || errorText}`);
          }
          
          const error = new Error(`Gemini API error (${response.status}): ${errorData.error?.message || errorText}`);
          error.status = response.status;
          throw error;
        }
        
        return response;
      }, 3, 1000);

      data = await geminiResponse.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      console.log('[Chat API] Final response after function calls:', responseText?.length || 0);
    }

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
