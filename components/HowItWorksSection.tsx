// components/HowItWorksSection.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { ExpandableCard } from "./ui/expandable-card";

const images = [
  "/images/placeholder.jpg", // Add a placeholder image for the first step
  "/images/onboarding.png",
  "/images/simulation.png",
  "/images/feedback.png"
] as const;

const HowItWorksSection: React.FC = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  
  const howItWorks = t('howItWorks') as any;
  const steps = howItWorks.steps;
  const tags = howItWorks.tags;

  return (
    <section className="w-full bg-[#F2F1E4] py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1F2923] mb-4">
            {howItWorks.title}
          </h2>
          <p className="text-xl text-[#1F2923]/80">
            {howItWorks.subtitle}
          </p>
        </div>

        <div className="flex flex-row gap-4 h-[400px] mb-8">
          {steps.map((step: any, index: number) => (
            <ExpandableCard
              key={index}
              number={step.number}
              title={step.title}
              description={step.description}
              imageSrc={images[index]}
              isActive={activeIndex === index}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 justify-center">
          {tags.map((tag: string, index: number) => (
            <button
              key={index}
              onClick={() => console.log('Tag clicked:', tag)}
              className="px-6 py-2 rounded-full border-2 border-[#1F2923]/20 text-[#1F2923] hover:bg-[#1F2923] hover:text-white transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
