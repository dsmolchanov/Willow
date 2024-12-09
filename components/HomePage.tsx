"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

// Dynamically import components
const BackgroundGradientAnimation = dynamic(
  () => import("@/components/ui/background-gradient-animation").then(mod => mod.BackgroundGradientAnimation),
  { ssr: false }
);

const HeroSection = dynamic(() => import("@/components/HeroSection"), { ssr: false });
const BenefitsSection = dynamic(() => import("@/components/BenefitsSection"), { ssr: false });
const HowItWorksSection = dynamic(() => import("@/components/HowItWorksSection"), { ssr: false });
const CallToActionSection = dynamic(() => import("@/components/CallToActionSection"), { ssr: false });

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

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