import { createClient } from '@supabase/supabase-js';

// Create a single instance of the Supabase client
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: undefined,
      storageKey: undefined
    },
    global: {
      headers: {}
    }
  }
);

export function getSupabaseClient() {
  return supabaseClient;
}

export async function getAuthenticatedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined,
        storageKey: undefined
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}