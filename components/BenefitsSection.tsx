// components/BenefitsSection.tsx
"use client";

import React from "react";
import { EvervaultCard, Icon } from "./ui/evervault-card";
import { useLanguage } from "@/context/LanguageContext";

const BenefitsSection: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('workplace');

  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">
          {t('benefits', `${activeTab}.title`)}
        </h3>

        {/* Add Tab Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          {['workplace', 'personal', 'general'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg ${
                activeTab === tab
                  ? 'bg-black text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {t('benefits', `${tab}.tab`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Update card translations to use activeTab */}
          {['confidence', 'empathy', 'resolution'].map((card) => (
            <div key={card} className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative min-h-[32rem]">
              <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
              <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
              <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
              <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
              <div className="h-full w-full">
                <EvervaultCard 
                  title={t('benefits', `${activeTab}.cards.${card}.title`)}
                  text={t('benefits', `${activeTab}.cards.${card}.text`)}
                  description={t('benefits', `${activeTab}.cards.${card}.description`)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
