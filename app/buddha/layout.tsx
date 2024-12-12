"use client";

import { SoundCloudProvider } from "@/context/SoundCloudContext";

export default function BuddhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SoundCloudProvider>
      {children}
    </SoundCloudProvider>
  );
} 