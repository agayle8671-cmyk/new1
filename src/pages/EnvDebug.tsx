/**
 * EnvDebug.tsx
 * 
 * Temporary diagnostic page to verify environment variables.
 * Remove this file after debugging.
 */

export default function EnvDebug() {
  const allEnvVars = import.meta.env;
  const viteVars = Object.keys(allEnvVars).filter(k => k.startsWith('VITE_'));
  
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Environment Variable Debug</h1>
      
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">VITE_ Variables (Client-Side)</h2>
        <div className="space-y-2">
          {viteVars.length > 0 ? (
            viteVars.map(key => (
              <div key={key} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                <code className="text-cyan-electric font-mono text-sm">{key}</code>
                <span className="text-gray-400">
                  {allEnvVars[key] ? '✅ Set' : '❌ Not set'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-danger">⚠️ No VITE_ variables found!</p>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">All Environment Variables (First 20)</h2>
        <pre className="text-xs bg-white/5 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(
            Object.fromEntries(
              Object.entries(allEnvVars).slice(0, 20).map(([k, v]) => [
                k,
                k.includes('KEY') || k.includes('SECRET') ? '***HIDDEN***' : v
              ])
            ),
            null,
            2
          )}
        </pre>
      </div>

      <div className="glass-card p-6 bg-warning/10 border border-warning/30">
        <h2 className="text-lg font-semibold mb-2 text-warning">📍 How to Add API Key in Vercel</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">Step 1: Find Environment Variables</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-2">
              <li>Go to <a href="https://vercel.com/dashboard" target="_blank" className="text-cyan-electric hover:underline">vercel.com/dashboard</a></li>
              <li>Click on your project: <strong>new1</strong></li>
              <li>Click <strong>"Settings"</strong> (top navigation bar)</li>
              <li>Click <strong>"Environment Variables"</strong> (left sidebar)</li>
            </ol>
          </div>
          
          <div>
            <p className="font-medium mb-2">Step 2: Add the Variable</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-2">
              <li>Click <strong>"Add New"</strong> button</li>
              <li><strong>Key:</strong> <code className="bg-white/10 px-1 rounded">GOOGLE_AI_KEY</code> (exact match, case-sensitive, NO VITE_ prefix)</li>
              <li><strong>Value:</strong> Your API key from Google AI Studio</li>
              <li><strong>Environments:</strong> Check <strong>✅ Production</strong> (and Preview/Development if you want)</li>
              <li><strong>⚠️ Important:</strong> Use <code>GOOGLE_AI_KEY</code> (not <code>VITE_GOOGLE_AI_KEY</code>) because the API key is stored server-side in the Vercel serverless function, not exposed to the browser.</li>
              <li>Click <strong>"Save"</strong></li>
            </ol>
          </div>
          
          <div>
            <p className="font-medium mb-2">Step 3: Redeploy</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 ml-2">
              <li>Go to <strong>"Deployments"</strong> tab (top navigation)</li>
              <li>Find the latest deployment</li>
              <li>Click the <strong>⋮</strong> (three dots) menu</li>
              <li>Click <strong>"Redeploy"</strong></li>
              <li>Wait 1-2 minutes for rebuild</li>
              <li>Hard refresh this page: <code className="bg-white/10 px-1 rounded">Ctrl + Shift + R</code></li>
            </ol>
          </div>
          
          <div className="mt-4 p-3 bg-cyan-electric/10 rounded-lg border border-cyan-electric/30">
            <p className="text-xs text-cyan-electric font-medium">💡 Direct Links:</p>
            <div className="mt-2 space-y-1">
              <a href="https://vercel.com/dashboard" target="_blank" className="block text-xs text-cyan-electric hover:underline">
                → Vercel Dashboard
              </a>
              <a href="https://aistudio.google.com/apikey" target="_blank" className="block text-xs text-cyan-electric hover:underline">
                → Get Google AI API Key
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

