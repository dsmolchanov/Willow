// app/layout.tsx
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { NavBar } from "@/components/NavBar";
import { LanguageProvider } from "@/context/LanguageContext";
import { ElevenLabsScript } from "@/components/ElevenLabsScript";
import { WidgetProvider } from "@/context/WidgetContext";
import { usePathname } from 'next/navigation';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '700']
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${poppins.className} relative min-h-screen`}>
          <LanguageProvider>
            <WidgetProvider>
              <ElevenLabsScript />
              <div className="fixed inset-0 z-0">
                <BackgroundGradientAnimation />
              </div>
              <div className="relative z-10 min-h-screen overflow-auto">
                {!isDashboard && <NavBar />}
                <main className={!isDashboard ? "pt-20" : undefined}>
                  {children}
                </main>
              </div>
            </WidgetProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
