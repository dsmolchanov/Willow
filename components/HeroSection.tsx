// components/HeroSection.tsx
"use client";

import React from "react";
import { FlipWords } from "@/components/ui/flip-words";
import { useLanguage } from "@/context/LanguageContext";
import { useWidget } from "@/context/WidgetContext";

const HeroSection: React.FC = () => {
  const { t } = useLanguage();
  const { isHeroWidgetVisible } = useWidget();
  const tools = t('hero', 'tools') as unknown as string[];

  return (
    <section className="flex flex-col items-center justify-center w-full h-full">
      <div className="space-y-8 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white">
          {t('hero', 'title')}
        </h1>
        <div className="text-xl md:text-2xl max-w-2xl mx-auto px-4 text-white/80">
          {t('hero', 'subtitle')}{" "}
          <FlipWords 
            words={tools}
            className="inline-block text-white font-bold" 
            duration={3000} 
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
