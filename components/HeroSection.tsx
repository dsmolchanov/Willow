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
  const stats = t('hero', 'stats') as any;

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16 max-w-7xl mx-auto px-4">
        {(['skills', 'practice', 'training', 'stages'] as const).map((stat) => (
          <div key={stat} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center hover:bg-white/15 transition-all border-2 border-white/20">
            <div className="text-4xl font-bold text-white mb-2">
              {stats[stat].number}
            </div>
            <div className="text-xl font-semibold text-white mb-2">
              {stats[stat].title}
            </div>
            <p className="text-white/80 text-sm">
              {stats[stat].description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
