"use client";

import { ElevenLabsWidget } from "@/components/ElevenLabsWidget";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect } from "react";

export default function BuddhaPage() {
  const { setLanguage } = useLanguage();

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
      
      <div className="flex justify-center p-8">
        <ElevenLabsWidget 
          agentId="76rHd9XeWPDuopdjONg6" 
          translationPath="buddha.widget" 
        />
      </div>
    </div>
  );
} 