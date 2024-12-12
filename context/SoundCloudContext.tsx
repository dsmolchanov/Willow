"use client";

import { createContext, useContext, useState } from 'react';

interface SoundCloudContextType {
  currentTrack: string | null;
  setCurrentTrack: (url: string | null) => void;
}

const SoundCloudContext = createContext<SoundCloudContextType | undefined>(undefined);

export function SoundCloudProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);

  return (
    <SoundCloudContext.Provider value={{ currentTrack, setCurrentTrack }}>
      {children}
    </SoundCloudContext.Provider>
  );
}

export function useSoundCloud() {
  const context = useContext(SoundCloudContext);
  if (context === undefined) {
    throw new Error('useSoundCloud must be used within a SoundCloudProvider');
  }
  return context;
} 