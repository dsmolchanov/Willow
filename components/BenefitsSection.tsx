// components/BenefitsSection.tsx
"use client";

import React from "react";
import { EvervaultCard, Icon } from "./ui/evervault-card";
import { useLanguage } from "@/context/LanguageContext";

const BenefitsSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">
          {t('benefits', 'workplace.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Confidence Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative min-h-[32rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <div className="h-full w-full">
              <EvervaultCard 
                title={t('benefits', 'workplace.cards.confidence.title')}
                text={t('benefits', 'workplace.cards.confidence.text')}
                description={t('benefits', 'workplace.cards.confidence.description')}
              />
            </div>
          </div>

          {/* Empathy Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative min-h-[32rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <div className="h-full w-full">
              <EvervaultCard 
                title={t('benefits', 'workplace.cards.empathy.title')}
                text={t('benefits', 'workplace.cards.empathy.text')}
                description={t('benefits', 'workplace.cards.empathy.description')}
              />
            </div>
          </div>

          {/* Conflict Resolution Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative min-h-[32rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <div className="h-full w-full">
              <EvervaultCard 
                title={t('benefits', 'workplace.cards.resolution.title')}
                text={t('benefits', 'workplace.cards.resolution.text')}
                description={t('benefits', 'workplace.cards.resolution.description')}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
