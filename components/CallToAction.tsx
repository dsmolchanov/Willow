'use client';

import { translations } from '@/translations';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import Link from 'next/link';

export const CallToAction = () => {
  const t = translations.en;

  return (
    <BackgroundGradientAnimation>
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="font-['Instrument_Sans'] text-[26px] font-normal leading-[23px] tracking-[10px] text-white mb-8">
              {t.callToAction.title}
            </h2>
            <p className="text-white/80 max-w-2xl mb-12 text-lg">
              {t.callToAction.description}
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-transparent border-2 border-white/20 rounded-full hover:bg-white/10 transition-colors duration-200"
            >
              {t.whoNeedsThis.cta}
            </Link>
          </div>
        </div>
      </section>
    </BackgroundGradientAnimation>
  );
};

export default CallToAction; 