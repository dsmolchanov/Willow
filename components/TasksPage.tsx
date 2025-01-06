"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TasksContent() {
  const searchParams = useSearchParams();
  // ... rest of your component logic

  return (
    <div>
      {/* Your component content */}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
} 