import { Suspense } from 'react';
import LessonsComponent from '@/components/LessonsPage';

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function LessonsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading lessons...</div>
      </div>
    }>
      <LessonsComponent />
    </Suspense>
  );
}