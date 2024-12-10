"use client";

import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

const TheoryClient = dynamicImport(
  () => import('@/components/TheorySidebar').then(mod => ({ default: mod.TheorySidebar })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading theory...</div>
      </div>
    ),
  }
);

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function TheoryPage() {
  return (
    <Suspense>
      <TheoryClient />
    </Suspense>
  );
}