"use client";

import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import CallToActionSection from "@/components/CallToActionSection";

export default function HomePage() {
  return (
    <>
      <BackgroundGradientAnimation 
        containerClassName="!h-[80vh]"
      >
        <div className="h-full flex items-center justify-center">
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