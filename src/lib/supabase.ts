import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Turned off deliberately: the auth callback page (app/auth/callback)
    // manually calls exchangeCodeForSession(code) itself. Leaving this on
    // caused Supabase's client to also auto-exchange the same one-time
    // PKCE code in the background — a race where whichever ran first won,
    // and the other failed with "PKCE code verifier not found in storage."
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});