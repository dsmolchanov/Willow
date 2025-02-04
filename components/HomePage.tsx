"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { ElevenLabsWidget } from "@/components/ElevenLabsWidget";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/translations';
import Footer from "@/components/Footer";

const HeroSection = dynamic(() => import("@/components/HeroSection"), { ssr: false });
const WhoNeedsThisSection = dynamic(() => import("@/components/WhoNeedsThisSection"), { ssr: false });
const BenefitsSection = dynamic(() => import("@/components/BenefitsSection"), { ssr: false });
const HowItWorksSection = dynamic(() => import("@/components/HowItWorksSection"), { ssr: false });
const CallToActionSection = dynamic(() => import("@/components/CallToActionSection"), { ssr: false });

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { language } = useLanguage();
  
  const { id: agentId, title, scenario_id, skill_ids } = translations[language].agent;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="min-h-[100vh] w-full">
        <BackgroundGradientAnimation>
          <div className="h-[100vh] w-full flex items-center justify-center">
            <HeroSection />
          </div>
        </BackgroundGradientAnimation>
      </div>
      
      <WhoNeedsThisSection />
      
      <div className="bg-white">
        <BenefitsSection />
        <HowItWorksSection />
        <CallToActionSection />
      </div>

      <Footer />

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <ElevenLabsWidget 
          agentId={agentId} 
          scenarioInfo={{
            title,
            scenario_id,
            skill_ids: [...skill_ids]
          }}
        />
      </div>
    </>
  );
} 