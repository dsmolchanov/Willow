// components/CallToActionSection.tsx
"use client";
import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ElevenLabsWidget } from "./ElevenLabsWidget";
import { useWidget } from "@/context/WidgetContext";

const CallToActionSection: React.FC = () => {
  const { t } = useLanguage();
  const { isHeroWidgetVisible } = useWidget();

  return (
    <section id="cta-section" className="py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-willow-dark to-willow-light">
          {t('callToAction', 'title')}
        </h2>
        <p className="text-lg mb-32 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t('callToAction', 'description')}
        </p>
      </div>
    </section>
  );
};

export default CallToActionSection;
