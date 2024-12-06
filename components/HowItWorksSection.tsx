// components/HowItWorksSection.tsx
import React from "react";

const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
        <div className="flex flex-col md:flex-row justify-center items-start gap-12">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-full mb-4">1</div>
            <h4 className="text-xl font-semibold mb-2">Onboarding</h4>
            <p className="text-center">
              Define your unique traits through an engaging avatar conversation to tailor your skill development journey.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-full mb-4">2</div>
            <h4 className="text-xl font-semibold mb-2">Personalized Simulations</h4>
            <p className="text-center">
              Participate in conversational simulations that reflect your real-life contexts and challenges.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-full mb-4">3</div>
            <h4 className="text-xl font-semibold mb-2">Feedback & Growth</h4>
            <p className="text-center">
              Receive actionable feedback and track your progress to master your communication skills over time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
