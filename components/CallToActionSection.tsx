// components/CallToActionSection.tsx
import React from "react";
import Link from "next/link";

const CallToActionSection: React.FC = () => {
  return (
    <section className="py-16 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h3 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Communication Skills?</h3>
        <p className="text-lg text-white mb-8">
          Start your personalized training journey today and unlock your full potential in handling any conversation.
        </p>
        <Link 
          href="/onboarding" 
          className="bg-white text-blue-600 font-semibold py-3 px-6 rounded-full text-lg transition duration-300 hover:bg-gray-200"
        >
          Get Started Now
        </Link>
      </div>
    </section>
  );
};

export default CallToActionSection;
