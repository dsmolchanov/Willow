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
              {isPublicRoute && <NavBar />}
              <SupabaseProvider>
                {children}
              </SupabaseProvider>
            </WidgetProvider>
          </LanguageProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
