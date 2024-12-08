// app/layout.tsx
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { Navbar } from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import { ElevenLabsScript } from "@/components/ElevenLabsScript";
import { WidgetProvider } from "@/context/WidgetContext";

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '700']
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                <Navbar />
                <main className="pt-20">{children}</main>
              </div>
            </WidgetProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
