// components/CallToActionSection.tsx
"use client";
import React from "react";
import { Button } from "@/components/ui/moving-border";
import { useRouter } from 'next/navigation';

const CallToActionSection: React.FC = () => {
  const router = useRouter();

  const handleNavigation = () => {
    router.push('/onboarding');
  };

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-willow-dark to-willow-light">
          Ready to Transform Your Communication Skills?
        </h2>
        <p className="text-lg mb-10 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Join thousands of others who have already enhanced their interpersonal abilities through our AI-powered platform.
        </p>
        <div className="flex justify-center">
          <Button
            borderRadius="0.75rem"
            className="bg-willow-primary text-white border-2 border-willow-dark rounded-xl hover:bg-willow-light"
            borderClassName="bg-[radial-gradient(var(--willow-primary)_40%,transparent_60%)] w-[100px] h-[100px] rounded-xl"
            containerClassName="p-[1px] hover:scale-105 transition-transform rounded-xl"
            rx="30%"
            ry="30%"
            duration={4000}
            onClick={handleNavigation}
            style={{
              '--willow-primary': '#5DCFA1',
            } as React.CSSProperties}
          >
            Get me onboard
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;
