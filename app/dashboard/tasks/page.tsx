'use client';

import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the tasks component
const TasksComponent = dynamic(
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
export const config = {
  runtime: 'edge',
  dynamic: 'force-dynamic'
};

export default function TasksPage() {
  return <TasksComponent />;
} 