import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Session } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export function createClerkSupabaseClient(session: Session | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        let clerkToken;
        try {
          clerkToken = await session?.getToken({ template: 'supabasetrAiner' });
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
          // Handle error appropriately, maybe throw or return a default fetch
        }
        const headers = new Headers(options?.headers);
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`);
        }
        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
}