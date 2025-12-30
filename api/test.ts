/**
 * api/test.ts
 * 
 * Debug endpoint to verify API key is accessible in Edge runtime
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const apiKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;

  return new Response(
    JSON.stringify({
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      apiKeyStartsWith: apiKey ? apiKey.substring(0, 5) : 'none',
      environment: 'edge',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

