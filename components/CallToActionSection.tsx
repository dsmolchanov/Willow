// components/CallToActionSection.tsx
"use client";

import { translations } from '@/translations';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import { useLanguage } from '@/context/LanguageContext';

export const CallToActionSection = () => {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <BackgroundGradientAnimation>
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 uppercase tracking-[10px]">
              {t.callToAction.title}
            </h2>
            <p className="text-white/80 max-w-2xl text-lg">
              {t.callToAction.description}
            </p>
          </div>
        </div>
      </section>
    </BackgroundGradientAnimation>
  );
};

export default CallToActionSection;
