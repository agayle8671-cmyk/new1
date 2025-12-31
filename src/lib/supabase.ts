import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('🔍 Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
    keyPrefix: supabaseAnonKey?.substring(0, 20) || 'N/A',
    keyEndsWith: supabaseAnonKey?.substring(supabaseAnonKey.length - 10) || 'N/A',
  });
}

// Check for common mistakes: service role key being used instead of anon key
if (supabaseAnonKey) {
  // Service role keys are usually much longer (200+ chars) vs anon keys (~150-180 chars)
  if (supabaseAnonKey.length > 200) {
    console.error('⚠️ WARNING: Supabase key appears to be a service role key. Use VITE_SUPABASE_ANON_KEY (anon/public key) in Railway, not the service role key!');
  }
  
  // Check if key looks like it might be a service role key (contains service_role in JWT)
  // Service role keys often have a different structure, but we can't decode JWT in browser
  // The main check is length - anon keys are typically 150-180 chars
  if (supabaseAnonKey.length < 100) {
    console.error('⚠️ WARNING: Supabase key appears too short. Anon keys are typically 150-180 characters.');
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('❌ Supabase credentials not found. Database features will be disabled.');
  console.warn('💡 To fix: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Railway environment variables.');
  console.warn('💡 Make sure to rebuild after adding variables (Vite needs them at build time)');
}

// Create client with auth options to help debug
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false, // Don't persist auth sessions for demo
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-client-info': 'runway-dna@1.0.0',
    },
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Debug function to test Supabase connection (expose to window for console testing)
if (import.meta.env.DEV) {
  (window as any).testSupabaseConnection = async () => {
    console.log('🧪 Testing Supabase connection...');
    console.log('Config:', {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
      key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
      keyLength: supabaseAnonKey?.length || 0,
    });
    
    try {
      // Test a simple query
      const { data, error } = await supabase
        .from('dna_snapshots')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('❌ Supabase test failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        return { success: false, error };
      }
      
      console.log('✅ Supabase connection successful!', data);
      return { success: true, data };
    } catch (err) {
      console.error('❌ Supabase test exception:', err);
      return { success: false, error: err };
    }
  };
  
  console.log('💡 Run testSupabaseConnection() in the browser console to test the connection');
}
