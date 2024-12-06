// components/FeaturesSection.tsx
import React from "react";
import { 
  FaComments, 
  FaUserGraduate, 
  FaChartLine,
  FaSmile,      // for confidence
  FaHandHoldingHeart,  // for empathy
  FaHandshake   // for conflict resolution
} from "react-icons/fa";

const FeaturesSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">Features</h3>
        <div className="flex flex-col md:flex-row justify-center items-center gap-12">
          <div className="flex flex-col items-center">
            <FaSmile className="text-blue-600 text-5xl mb-4" />
            <h4 className="text-xl font-semibold mb-2">Confidence Building</h4>
            <p className="text-center">
              Build your confidence through practice and positive reinforcement.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <FaHandHoldingHeart className="text-blue-600 text-5xl mb-4" />
            <h4 className="text-xl font-semibold mb-2">Empathy Training</h4>
            <p className="text-center">
              Develop deeper understanding and connection with others through empathy exercises.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <FaHandshake className="text-blue-600 text-5xl mb-4" />
            <h4 className="text-xl font-semibold mb-2">Conflict Resolution</h4>
            <p className="text-center">
              Learn effective strategies to navigate and resolve interpersonal conflicts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
