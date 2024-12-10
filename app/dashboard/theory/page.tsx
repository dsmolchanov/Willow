"use client";

import React from 'react';
import { TheorySidebar } from '@/components/TheorySidebar';

const TheoryPage = () => {
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Theory</h1>
      <TheorySidebar />
    </div>
  );
};

export default TheoryPage;