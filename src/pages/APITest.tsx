/**
 * APITest.tsx
 * 
 * Diagnostic page to test the serverless function directly
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function APITest() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setStatus('testing');
    setResult(null);
    setError(null);

    try {
      console.log('[APITest] Testing /api/gemini endpoint...');
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Say "Hello" in one word.',
          context: null,
          conversationHistory: [],
        }),
      });

      console.log('[APITest] Response status:', response.status);
      console.log('[APITest] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[APITest] Response data:', data);

      if (response.ok) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setError(data.error || `HTTP ${response.status}`);
        setResult(data);
      }
    } catch (err) {
      console.error('[APITest] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <motion.div
      className="min-h-screen p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">API Diagnostic Test</h1>
          <p className="text-gray-400">
            Test the serverless function directly to diagnose issues
          </p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <button
            onClick={testAPI}
            disabled={status === 'testing'}
            className="w-full px-4 py-3 bg-cyan-electric text-charcoal rounded-lg font-medium hover:bg-cyan-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'testing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test /api/gemini Endpoint'
            )}
          </button>

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-success/20 border border-success/30 rounded-lg flex items-start gap-3"
            >
              <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-success mb-2">✅ API Test Successful</h3>
                <pre className="text-xs text-gray-300 bg-white/5 p-3 rounded overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-danger/20 border border-danger/30 rounded-lg flex items-start gap-3"
            >
              <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-danger mb-2">❌ API Test Failed</h3>
                <p className="text-sm text-gray-300 mb-2">{error}</p>
                {result && (
                  <pre className="text-xs text-gray-300 bg-white/5 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          )}

          <div className="border-t border-white/10 pt-4 space-y-2">
            <h3 className="font-semibold text-sm mb-2">📋 Checklist:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✅ Check browser console (F12) for detailed logs</li>
              <li>✅ Check Network tab (F12 → Network) for request/response</li>
              <li>✅ Check Vercel Dashboard → Functions → api/gemini for server logs</li>
              <li>✅ Verify GOOGLE_AI_KEY is set in Vercel (not VITE_GOOGLE_AI_KEY)</li>
              <li>✅ Ensure @vercel/node is in package.json dependencies</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

