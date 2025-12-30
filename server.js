import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching for now
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, prompt, context, conversationHistory } = req.body;
    const userMessage = message || prompt;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error('API key not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const systemPrompt =
      'You are the Runway DNA Strategic CFO. Analyze the provided financial data and give a short, actionable strategic insight. Keep it under 3 sentences.';

    let fullPrompt = `${systemPrompt}\n\n`;
    if (context) {
      fullPrompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    fullPrompt += `User Question: ${userMessage}`;

    if (conversationHistory && conversationHistory.length > 0) {
      const history = conversationHistory.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      history.push({
        role: 'user',
        parts: [{ text: fullPrompt }],
      });

      const chat = model.startChat({ history: history.slice(0, -1) });
      const result = await chat.sendMessage(fullPrompt);
      const response = result.response.text();

      return res.json({ response, text: response });
    } else {
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text();

      return res.json({ response, text: response });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Failed to get AI response',
      message: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  const distPath = join(__dirname, 'dist');
  const indexExists = existsSync(join(distPath, 'index.html'));
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Runway DNA API',
    port: port.toString(),
    distExists: existsSync(distPath),
    indexExists,
    distPath,
    nodeVersion: process.version,
    uptime: process.uptime(),
  });
});

// Serve static files
const distPath = join(__dirname, 'dist');

// Serve assets with proper headers
app.use('/assets', express.static(join(distPath, 'assets'), {
  maxAge: 0,
  etag: false
}));

// Serve other static files
app.use(express.static(distPath, {
  maxAge: 0,
  etag: false,
  index: false
}));

// Handle all routes - serve index.html
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = join(distPath, 'index.html');
  
  console.log(`Request: ${req.method} ${req.path}`);
  console.log(`Serving index from: ${indexPath}`);
  console.log(`Index exists: ${existsSync(indexPath)}`);
  
  if (!existsSync(indexPath)) {
    console.error('index.html not found!');
    return res.status(404).send('Application not found');
  }

  try {
    const content = readFileSync(indexPath, 'utf8');
    res.type('html').send(content);
  } catch (error) {
    console.error('Error reading index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Runway DNA API ready`);
  console.log(`🌐 Listening on 0.0.0.0:${port}`);
  console.log(`📁 Dist path: ${distPath}`);
  console.log(`📄 Index exists: ${existsSync(join(distPath, 'index.html'))}`);
});
