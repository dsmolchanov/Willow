"use client";

import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

const TasksClient = dynamicImport(
  () => import('@/components/TasksPage').then(mod => ({ default: mod.TasksContent })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    ),
  }
);

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function TasksPage() {
  return (
    <Suspense>
      <TasksClient />
    </Suspense>
  );
} 