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
                  {key === 'VITE_GOOGLE_AI_KEY' 
                    ? (allEnvVars[key] ? `✅ Set (${String(allEnvVars[key]).substring(0, 12)}...)` : '❌ NOT SET')
                    : allEnvVars[key] ? '✅ Set' : '❌ Not set'
                  }
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
        <h2 className="text-lg font-semibold mb-2 text-warning">Vercel Checklist</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Go to Vercel Dashboard → Your Project → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
          <li>Verify <code className="bg-white/10 px-1 rounded">VITE_GOOGLE_AI_KEY</code> exists</li>
          <li>Check it's enabled for <strong>Production</strong> (not just Preview/Development)</li>
          <li>After adding/updating, go to <strong>Deployments</strong> tab</li>
          <li>Click <strong>⋮</strong> on latest deployment → <strong>Redeploy</strong></li>
          <li>Wait 1-2 minutes for rebuild</li>
          <li>Hard refresh browser (<code className="bg-white/10 px-1 rounded">Ctrl + Shift + R</code>)</li>
        </ol>
      </div>
    </div>
  );
}

