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

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '700']
})

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isHomePage = pathname === '/';
  const isBuddhaPage = pathname === '/buddha';

  return (
    <div className={`${poppins.className} relative min-h-screen`}>
      <LanguageProvider>
        <WidgetProvider>
          {!isDashboard && !isHomePage && !isBuddhaPage && (
            <div className="fixed inset-0 z-0">
              <BackgroundGradientAnimation />
            </div>
          )}
          <div className="relative z-10 min-h-screen overflow-auto">
            {!isDashboard && !isBuddhaPage && <NavBar />}
            <main className={!isDashboard && !isHomePage && !isBuddhaPage ? "pt-20" : undefined}>
              {children}
            </main>
          </div>
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
      <html lang="en">
        <body>
          <Suspense fallback={<div>Loading...</div>}>
            <LayoutContent>{children}</LayoutContent>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
