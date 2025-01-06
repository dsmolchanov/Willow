import { Suspense } from 'react';
import TasksComponent from '@/components/TasksPage';

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