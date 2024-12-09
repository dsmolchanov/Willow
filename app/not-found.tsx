// app/not-found.tsx
"use client";

import { Suspense } from 'react';
import NotFoundPage from '@/components/NotFoundPage';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundPage />
    </Suspense>
  );
}
