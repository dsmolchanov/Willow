// app/layout.tsx
"use client";

import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

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
          <div className="fixed inset-0 z-0">
            <BackgroundGradientAnimation />
          </div>
          <div className="relative z-10 min-h-screen overflow-auto">
            <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center p-6 bg-transparent backdrop-blur-sm">
              <Link href="/" className="flex items-center">
                <Image
                  src="/images/willow_logo.png"
                  alt="Willow Training Logo"
                  width={150}
                  height={40}
                  className="object-contain"
                />
              </Link>
              <nav>
                <Link href="/" className="text-white px-4 hover:underline">
                  Home
                </Link>
                <Link href="/interactive-avatar" className="text-white px-4 hover:underline">
                  Interactive Avatar
                </Link>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </nav>
            </header>

            <main className="pt-20">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
