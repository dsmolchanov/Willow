import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '@clerk/nextjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [client] = useState(() => 
    createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          try {
            const clerkToken = await session?.getToken({
              template: 'supabaseWillow',
            });
            
            const headers = new Headers(options?.headers);
            if (clerkToken) {
              headers.set('Authorization', `Bearer ${clerkToken}`);
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
    })
  );

  return (
    <SupabaseContext.Provider value={client}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return client;
} 