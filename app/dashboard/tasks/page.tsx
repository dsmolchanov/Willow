'use client';

import { Suspense } from 'react';
import TasksPage from '@/components/TasksPage';

// Force dynamic rendering and edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    }>
      <TasksPage />
    </Suspense>
  );
} 