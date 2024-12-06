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
        <body className={poppins.className}>
          <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center p-6 bg-transparent">
            <h1 className="text-white text-2xl font-bold">Willow.Training</h1>
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

          <main className="pt-20">{children}</main> {/* Added padding-top to offset fixed header */}
        </body>
      </html>
    </ClerkProvider>
  );
}
