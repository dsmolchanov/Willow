// components/BenefitsSection.tsx
"use client";

import React, { useState } from "react";
import { EvervaultCard, Icon } from "./ui/evervault-card";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

type BenefitCategory = 'workplace' | 'personal' | 'general';

const BenefitsSection: React.FC = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<BenefitCategory>('workplace');

  const renderBenefitCard = (type: 'confidence' | 'empathy' | 'resolution') => (
    <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative h-[28rem]">
      <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
      <EvervaultCard 
        title={t('benefits', `${activeCategory}.cards.${type}.title`)}
        text={t('benefits', `${activeCategory}.cards.${type}.text`)}
        description={t('benefits', `${activeCategory}.cards.${type}.description`)}
      />
    </div>
  );

  return (
    <section className="py-16 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center gap-8 mb-12">
          <h2 className="text-3xl font-bold text-center">
            {t('benefits', `${activeCategory}.title`)}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {(['workplace', 'personal', 'general'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-6 py-2 rounded-full transition-all duration-300",
                  activeCategory === category
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {t('benefits', `${category}.tab`)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(['confidence', 'empathy', 'resolution'] as const).map((type) => (
            <div key={type}>
              {renderBenefitCard(type)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
