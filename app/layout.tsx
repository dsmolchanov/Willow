// app/layout.tsx
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import { NavBar } from "@/components/NavBar";
import { LanguageProvider } from "@/context/LanguageContext";
import { WidgetProvider } from "@/context/WidgetContext";
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { SupabaseProvider } from '@/context/SupabaseContext';
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = !pathname.startsWith('/dashboard');
  const supabase = getSupabaseClient(fetch);

  return (
    <ClerkProvider>
      <SupabaseProvider supabase={supabase}>
        <LanguageProvider>
          <WidgetProvider>
            {isPublicRoute && <NavBar />}
            {children}
            <Toaster />
          </WidgetProvider>
        </LanguageProvider>
      </SupabaseProvider>
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(poppins.className, "min-h-screen bg-background")}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
