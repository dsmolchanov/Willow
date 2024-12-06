// components/BenefitsSection.tsx
import React from "react";
import { EvervaultCard, Icon } from "./ui/evervault-card";

const BenefitsSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Confidence Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative h-[24rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <EvervaultCard 
              title="Boost Confidence"
              text="Confidence"
              description="Gain the assurance to handle difficult conversations and high-pressure situations with ease."
            />
          </div>

          {/* Empathy Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative h-[24rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <EvervaultCard 
              title="Enhance Empathy"
              text="Empathy"
              description="Develop a deeper understanding of others' perspectives to foster meaningful and productive interactions."
            />
          </div>

          {/* Conflict Resolution Card */}
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start p-4 relative h-[24rem]">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
            <EvervaultCard 
              title="Master Conflict Resolution"
              text="Resolution"
              description="Learn effective strategies to resolve disagreements and maintain positive relationships."
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
