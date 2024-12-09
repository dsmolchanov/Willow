// app/not-found.tsx
"use client";

import { Suspense } from 'react'
import { default as dynamicImport } from 'next/dynamic'

const NotFoundClient = dynamicImport(() => import('@/components/NotFoundPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading...</div>
    </div>
  ),
})

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function NotFoundPage() {
  return (
    <Suspense>
      <NotFoundClient />
    </Suspense>
  )
}
