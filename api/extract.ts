import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Financial Data Extraction Endpoint
// Specialized for parsing structured and unstructured financial data

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, contentType } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Extraction prompt is required' });
        }

        const apiKey = process.env.GOOGLE_AI_KEY;
        if (!apiKey) {
            console.error('[Extract API] ❌ API key not configured');
            return res.status(500).json({
                error: 'API key not configured',
                hint: 'Add GOOGLE_AI_KEY to environment variables',
            });
        }

        // Initialize Google Generative AI SDK
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-preview-05-20',
        });

        console.log(`[Extract API] 📊 Processing ${contentType} extraction request`);

        // Generate content with extraction-optimized settings
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2, // Low temperature for precise extraction
                topK: 20,
                topP: 0.8,
                maxOutputTokens: 4096,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' as const },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' as const },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' as const },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' as const },
            ],
        });

        const response = result.response;
        const text = response.text();

        if (!text) {
            throw new Error('Empty response from AI');
        }

        console.log('[Extract API] ✅ Extraction complete');
        return res.status(200).json({ response: text });

    } catch (error: unknown) {
        console.error('[Extract API] ❌ Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            error: 'Extraction failed',
            details: errorMessage
        });
    }
}
