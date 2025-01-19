// app/layout.tsx
"use client";

import { ClerkProvider, useAuth, SignIn, SignUp } from "@clerk/nextjs";
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
  const isPublicRoute = pathname === '/' || 
    pathname.startsWith('/sign-in') || 
    pathname.startsWith('/sign-up') || 
    pathname.startsWith('/verify-email');

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
                <AuthWrapper pathname={pathname}>
                  {children}
                </AuthWrapper>
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

function AuthWrapper({ children, pathname }: { children: React.ReactNode, pathname: string }) {
  const commonAppearance = {
    elements: {
      rootBox: "mx-auto",
      card: "rounded-xl shadow-lg",
      headerTitle: "text-2xl font-bold",
      headerSubtitle: "text-gray-600",
      formButtonPrimary: "bg-primary hover:bg-primary/90",
      socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50",
      formFieldInput: "border-gray-200 focus:border-primary",
      dividerLine: "bg-gray-200",
      dividerText: "text-gray-500",
      footer: "text-gray-500"
    }
  };

  const renderAuthComponent = () => {
    if (pathname.startsWith('/sign-in')) {
      return <SignIn appearance={commonAppearance} />;
    }
    
    if (pathname.startsWith('/sign-up')) {
      return <SignUp appearance={commonAppearance} />;
    }

    return children;
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      {renderAuthComponent()}
    </div>
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
