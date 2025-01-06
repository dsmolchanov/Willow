'use client';

import { Suspense } from "react";
import dynamic from "next/dynamic";

const TasksComponent = dynamic(() => import('@/components/TasksPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading tasks...</div>
    </div>
  ),
});

// Force dynamic rendering and edge runtime
export const dynamicConfig = 'force-dynamic';
export const runtime = 'edge';

export default function TasksPage() {
  return (
    <Suspense>
      <TasksComponent />
    </Suspense>
  );
} 