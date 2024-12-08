"use client";

import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CallToActionSection from "@/components/CallToActionSection";

export default function HomePage() {
  return (
    <>
      <BackgroundGradientAnimation 
        containerClassName="min-h-[90vh]"
      >
        <div className="h-full w-full flex items-center justify-center py-16">
          <HeroSection />
        </div>
      </BackgroundGradientAnimation>
      
      <div className="bg-white">
        <BenefitsSection />
        <HowItWorksSection />
        <CallToActionSection />
      </div>
    </>
  );
}