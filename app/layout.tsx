// app/layout.tsx
"use client";

import { ClerkProvider, useAuth, SignIn } from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { NavBar } from "@/components/NavBar";
import { LanguageProvider } from "@/context/LanguageContext";
import { WidgetProvider } from "@/context/WidgetContext";
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { SupabaseProvider } from '@/context/SupabaseContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { cn } from "@/lib/utils";

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-poppins',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRoute = pathname === '/';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen font-sans antialiased",
        poppins.variable
      )}>
        <ClerkProvider>
          <LanguageProvider>
            <WidgetProvider>
              <NavBar />
              {isPublicRoute ? (
                children
              ) : (
                <SupabaseWrapper>
                  {children}
                </SupabaseWrapper>
              )}
            </WidgetProvider>
          </LanguageProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}

function SupabaseWrapper({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [supabase, setSupabase] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const setupSupabase = async () => {
      const fetchCallback = async (url: string, options = {}) => {
        try {
          const token = await getToken({
            template: 'supabaseWillow'
          });

          if (!token) {
            throw new Error('Failed to get Supabase token');
          }

          const headers = new Headers(options?.headers);
          headers.set('Authorization', `Bearer ${token}`);

          return fetch(url, {
            ...options,
            headers,
          });
        } catch (error) {
          throw new Error('Failed to authenticate request');
        }
      };

      const client = getSupabaseClient(fetchCallback);
      setSupabase(client);
    };

    setupSupabase();
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-500">
          Loading authentication...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "rounded-xl shadow-lg",
              headerTitle: "text-2xl font-bold",
              headerSubtitle: "text-gray-600"
            }
          }}
        />
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-500">
          Setting up database connection...
        </div>
      </div>
    );
  }

  return (
    <SupabaseProvider supabase={supabase}>
      {children}
    </SupabaseProvider>
  );
}
