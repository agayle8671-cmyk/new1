/**
 * api/test.ts
 * 
 * Debug endpoint to verify API key is accessible in Node.js runtime
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

  return res.status(200).json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
    apiKeyStartsWith: apiKey ? apiKey.substring(0, 5) : 'none',
    environment: 'nodejs',
    timestamp: new Date().toISOString(),
  });
}

