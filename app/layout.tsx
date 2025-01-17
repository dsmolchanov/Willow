// app/layout.tsx
"use client";

import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { NavBar } from "@/components/NavBar";
import { LanguageProvider } from "@/context/LanguageContext";
import { WidgetProvider } from "@/context/WidgetContext";
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { SupabaseProvider } from '@/contexts/SupabaseContext';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '700']
})

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isHomePage = pathname === '/';
  const isBuddhaPage = pathname === '/buddha';
  const isCookingPage = pathname === '/cooking';

  return (
    <div className={`${poppins.className} relative min-h-screen`}>
      <LanguageProvider>
        <WidgetProvider>
          {!isDashboard && !isHomePage && !isBuddhaPage && !isCookingPage && (
            <div className="fixed inset-0 z-0">
              <BackgroundGradientAnimation />
            </div>
          )}
          <div className="relative z-10 min-h-screen overflow-auto">
            {!isDashboard && !isBuddhaPage && !isCookingPage && <NavBar />}
            <main className={!isDashboard && !isHomePage && !isBuddhaPage && !isCookingPage ? "pt-20" : undefined}>
              {children}
            </main>
          </div>
          <Toaster />
        </WidgetProvider>
      </LanguageProvider>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <SupabaseProvider>
        <html lang="en">
          <body>
            <Suspense fallback={<div>Loading...</div>}>
              <LayoutContent>{children}</LayoutContent>
            </Suspense>
          </body>
        </html>
      </SupabaseProvider>
    </ClerkProvider>
  );
}
