// components/TestimonialsSection.tsx
import React from "react";

const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">What Our Users Say</h3>
        <div className="space-y-8">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              "CommSkill has transformed the way I handle meetings. The personalized simulations made me more confident and effective in real-life scenarios."
            </p>
            <h5 className="text-lg font-semibold">- Alex Johnson</h5>
            <span className="text-sm text-gray-500">Project Manager</span>
          </div>
          <div className="bg-white shadow-lg rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              "The feedback I received was invaluable. I was able to identify my weaknesses and work on them systematically. Highly recommend!"
            </p>
            <h5 className="text-lg font-semibold">- Maria Garcia</h5>
            <span className="text-sm text-gray-500">Software Developer</span>
          </div>
          <div className="bg-white shadow-lg rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              "Engaging and realistic simulations that truly reflect my daily challenges. CommSkill has been a game-changer for my communication skills."
            </p>
            <h5 className="text-lg font-semibold">- Liam Smith</h5>
            <span className="text-sm text-gray-500">Sales Executive</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

