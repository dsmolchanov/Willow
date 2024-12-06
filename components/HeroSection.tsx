// components/HeroSection.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/moving-border";
import { FlipWords } from "@/components/ui/flip-words";
import { useRouter } from 'next/navigation';

const HeroSection: React.FC = () => {
  const router = useRouter();
  const communicationTools = ["interactive avatars", "voice agents", "learning pathway"];

  const handleNavigation = () => {
    router.push('/onboarding');
  };

  return (
    <section className="flex flex-col items-center justify-center text-center h-full w-full px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
        Master Your Soft Skills
      </h1>
      <div className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto px-4 text-white/80">
        Practice and improve your communication skills with our{" "}
        <FlipWords 
          words={communicationTools} 
          className="inline-block" 
          duration={3000} 
        />
      </div>
      <div className="mt-8">
        <Button
          borderRadius="0.75rem"
          className="bg-willow-primary text-white border-2 border-willow-dark rounded-xl hover:bg-willow-light"
          borderClassName="bg-[radial-gradient(var(--willow-primary)_40%,transparent_60%)] w-[100px] h-[100px] rounded-xl"
          containerClassName="p-[1px] hover:scale-105 transition-transform rounded-xl"
          rx="30%"
          ry="30%"
          duration={4000}
          onClick={handleNavigation}
          style={{
            '--willow-primary': '#5DCFA1',
          } as React.CSSProperties}
        >
          Get me onboard
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
