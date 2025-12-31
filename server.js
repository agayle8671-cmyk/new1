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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, prompt, context, conversationHistory } = req.body;
    const userMessage = message || prompt;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message required' });
    }

    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Format context values for display
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
- Runway: ${context.runway || 'N/A'} months
- Revenue growth: ${formatPercent(context.revenueGrowthRate)}
${context.customerCount ? `- Customers: ${Number(context.customerCount).toLocaleString()}` : ''}
${context.churnRate ? `- Churn rate: ${formatPercent(context.churnRate)}` : ''}
${context.employeeCount ? `- Team size: ${context.employeeCount} employees` : ''}
${context.monthlyPayroll ? `- Monthly payroll: ${formatCurrency(context.monthlyPayroll)}` : ''}
` : 'No financial data provided'}

When the user asks questions, analyze the data deeply and provide strategic guidance as a trusted CFO would.
You have access to functions to get detailed financial summaries and revenue forecasts. Use them when needed.`;
    
    let fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}`;

    const contents = [];
    
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: fullPrompt }]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // First API call with function declarations
    let requestBody = {
      contents,
      tools: [{ functionDeclarations }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    let geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return res.status(500).json({ error: 'AI request failed' });
    }

    let data = await geminiResponse.json();
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const functionCalls = data.candidates?.[0]?.content?.parts?.filter(part => part.functionCall);

    // Handle function calls
    if (functionCalls && functionCalls.length > 0) {
      // Add the model's response with function calls to conversation
      contents.push({
        role: 'model',
        parts: data.candidates[0].content.parts
      });

      // Execute functions and add results
      for (const functionCall of functionCalls) {
        const functionName = functionCall.functionCall.name;
        const args = JSON.parse(functionCall.functionCall.args || '{}');
        
        console.log(`[Function Call] ${functionName}`, args);
        
        const functionResult = executeFunction(functionName, args, context);
        
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

      geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini error (function response):', errorText);
        return res.status(500).json({ error: 'AI request failed' });
      }

      data = await geminiResponse.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    }

    return res.json({ response: responseText, text: responseText });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
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
