import { useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export function useClerkSupabaseClient() {
  const { session } = useSession();
  
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        fetch: async (url, options = {}) => {
          try {
            console.log('Fetching Clerk token using supabaseWillow template');
            const clerkToken = await session?.getToken({
              template: 'supabaseWillow',
            });
            
            console.log('Clerk token received:', clerkToken ? 'yes' : 'no');
            
            const headers = new Headers(options?.headers);
            if (clerkToken) {
              headers.set('Authorization', `Bearer ${clerkToken}`);
            } else {
              console.warn('No Clerk token available for Supabase request');
            }
            
            return fetch(url, {
              ...options,
              headers,
            });
          } catch (error) {
            console.error('Error in Supabase request:', error);
            throw error;
          }
        },
      },
    }
  );
} 