// Type declarations for Deno and Supabase Edge Functions

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string): any;
}

// Deno namespace declaration
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
} 