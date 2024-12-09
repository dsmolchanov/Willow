"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CallToActionSection from "@/components/CallToActionSection";

function HomeContent() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

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

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}