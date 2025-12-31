import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
- Cash on hand: ${context.cashOnHand ? `$${Number(context.cashOnHand).toLocaleString()}` : 'N/A'}
- Monthly burn: ${context.monthlyBurn ? `$${Number(context.monthlyBurn).toLocaleString()}` : 'N/A'}
- Monthly revenue: ${context.monthlyRevenue ? `$${Number(context.monthlyRevenue).toLocaleString()}` : 'N/A'}
- Runway: ${context.runway || 'N/A'} months
- Revenue growth: ${context.revenueGrowthRate ? `${(Number(context.revenueGrowthRate) * 100).toFixed(0)}%` : 'N/A'}
${context.customerCount ? `- Customers: ${Number(context.customerCount).toLocaleString()}` : ''}
${context.churnRate ? `- Churn rate: ${(Number(context.churnRate) * 100).toFixed(1)}%` : ''}
${context.employeeCount ? `- Team size: ${context.employeeCount} employees` : ''}
${context.monthlyPayroll ? `- Monthly payroll: $${Number(context.monthlyPayroll).toLocaleString()}` : ''}
` : 'No financial data provided'}

When the user asks questions, analyze the data deeply and provide strategic guidance as a trusted CFO would.`;
    
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
    
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return res.status(500).json({ error: 'AI request failed' });
    }

    const data = await geminiResponse.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

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
