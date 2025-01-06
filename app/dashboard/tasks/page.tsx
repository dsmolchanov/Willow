'use client';

import { Suspense } from 'react';
import { dynamicImport } from '@/lib/dynamic-import';

const TasksComponent = dynamicImport(
  () => import('@/components/TasksPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    ),
  }
);

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    }>
      <TasksComponent />
    </Suspense>
  );
}