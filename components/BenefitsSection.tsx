// components/BenefitsSection.tsx
import React from "react";
import { 
  FaSmile,             // for confidence
  FaHandHoldingHeart,  // for empathy
  FaHandshake         // for conflict resolution
} from "react-icons/fa";

const BenefitsSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center">
            <FaSmile className="w-16 h-16 mb-4 text-blue-600" />
            <h4 className="text-xl font-semibold mb-2">Boost Confidence</h4>
            <p className="text-center">
              Gain the assurance to handle difficult conversations and high-pressure situations with ease.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <FaHandHoldingHeart className="w-16 h-16 mb-4 text-blue-600" />
            <h4 className="text-xl font-semibold mb-2">Enhance Empathy</h4>
            <p className="text-center">
              Develop a deeper understanding of others' perspectives to foster meaningful and productive interactions.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <FaHandshake className="w-16 h-16 mb-4 text-blue-600" />
            <h4 className="text-xl font-semibold mb-2">Master Conflict Resolution</h4>
            <p className="text-center">
              Learn effective strategies to resolve disagreements and maintain positive relationships.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
