"use client";

import { ElevenLabsWidget } from "@/components/ElevenLabsWidget";
import { SoundCloudPlayer } from "@/components/SoundCloudPlayer";
import { useSoundCloud } from "@/context/SoundCloudContext";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

export default function BuddhaPage() {
  const { setLanguage } = useLanguage();
  const { currentTrack } = useSoundCloud();

  useEffect(() => {
    setLanguage('ru');
  }, [setLanguage]);

  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="relative flex-1">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
        >
          <source src="/video/avalokitesvara.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {currentTrack && (
        <div className="absolute bottom-[200px] left-0 right-0 px-8">
          <SoundCloudPlayer url={currentTrack} autoPlay={true} />
        </div>
      )}
      
      <div className="flex justify-center p-8">
        <ElevenLabsWidget 
          agentId="76rHd9XeWPDuopdjONg6" 
          translationPath="buddha.widget" 
        />
      </div>
    </div>
  );
} 