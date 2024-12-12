"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { ElevenLabsWidget } from "@/components/ElevenLabsWidget";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { useLanguage } from '@/context/LanguageContext';

const HeroSection = dynamic(() => import("@/components/HeroSection"), { ssr: false });
const BenefitsSection = dynamic(() => import("@/components/BenefitsSection"), { ssr: false });
const HowItWorksSection = dynamic(() => import("@/components/HowItWorksSection"), { ssr: false });
const CallToActionSection = dynamic(() => import("@/components/CallToActionSection"), { ssr: false });

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { language } = useLanguage();
  
  const agentId = language === 'ru' 
    ? "doXNIsa8qmit1NjLQxgT"
    : "cxRQ5scm1qhlOVdadUFp";

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
      
      <div className="bg-white">
        <BenefitsSection />
        <HowItWorksSection />
        <CallToActionSection />
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <ElevenLabsWidget agentId={agentId} />
      </div>
    </>
  );
} 