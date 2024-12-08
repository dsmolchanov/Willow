// components/HowItWorksSection.tsx
"use client";
import React from "react";
import { CardBody, CardContainer, CardItem } from "./ui/3d-card";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const images = [
  "/images/onboarding.png",
  "/images/simulation.png",
  "/images/feedback.png"
] as const;

const HowItWorksSection: React.FC = () => {
  const { t } = useLanguage();
  const steps = t('howItWorks', 'steps') as Array<{
    number: number;
    title: string;
    description: string;
  }>;

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-willow-dark to-willow-light">
          {t('howItWorks', 'title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <CardContainer key={index}>
              <CardBody className="bg-gray-50/80 relative group/card dark:hover:shadow-2xl dark:hover:shadow-willow-primary/[0.1] dark:bg-black/90 dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-6 border">
                <CardItem
                  translateZ={20}
                  className="text-xl font-bold text-neutral-600 dark:text-white"
                >
                  <div className="w-12 h-12 bg-willow-primary text-white flex items-center justify-center rounded-full mb-4 hover:bg-willow-light transition-colors">
                    {step.number}
                  </div>
                  {step.title}
                </CardItem>
                
                <CardItem
                  as="p"
                  translateZ={20}
                  className="text-neutral-500 text-sm mt-4 dark:text-neutral-300"
                >
                  {step.description}
                </CardItem>

                <CardItem translateZ={100} className="w-full mt-4">
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
                    <Image
                      src={images[index]}
                      alt={step.title}
                      fill
                      className="object-cover object-center group-hover/card:scale-105 transition-transform duration-200"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardItem>
              </CardBody>
            </CardContainer>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
