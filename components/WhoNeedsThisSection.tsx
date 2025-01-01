"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

const WhoNeedsThisSection: React.FC = () => {
  const { t } = useLanguage();
  const whoNeeds = t('whoNeedsThis') as any;

  return (
    <section className="w-full bg-[#F2F1E4] py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-[#1F2923] mb-16">
          {whoNeeds.title}
        </h2>
        
        <div className="space-y-8">
          {(['professionals', 'enthusiasts', 'companies'] as const).map((category) => (
            <div key={category} className="flex flex-col md:flex-row gap-8 border-b border-[#1F2923]/20 pb-8">
              <div className="md:w-1/4">
                <h3 className="text-xl font-semibold text-[#1F2923]">
                  {whoNeeds[category].title}
                </h3>
              </div>
              <div className="md:w-3/4">
                <p className="text-lg text-[#1F2923]/80">
                  {whoNeeds[category].description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <button className="bg-[#1F2923] text-white px-12 py-4 rounded-full text-lg font-semibold hover:bg-[#1F2923]/90 transition-colors">
            {whoNeeds.cta}
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhoNeedsThisSection; 