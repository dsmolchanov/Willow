import { useSession } from '@clerk/nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single client instance
let supabaseClient: SupabaseClient | null = null;

export function useClerkSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    if (!supabaseClient) {
      supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            fetch: async (url, options = {}) => {
              const token = await session?.getToken({ template: 'supabaseWillow' });
              const headers = new Headers(options?.headers);
              
              if (token) {
                headers.set('Authorization', `Bearer ${token}`);
              }
              
              // Add accept headers to avoid 406 errors
              headers.set('Accept', 'application/json');
              headers.set('Content-Type', 'application/json');
              
              return fetch(url, {
                ...options,
                headers
              });
            }
          }
        }
      );
    }

    return supabaseClient;
  }, [session]);
} 