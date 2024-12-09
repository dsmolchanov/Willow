// app/dashboard/conversations/page.tsx
"use client";

import { Suspense } from 'react'
import { default as dynamicImport } from 'next/dynamic'

const ConversationsClient = dynamicImport(() => import('@/components/ConversationsPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading conversations...</div>
    </div>
  ),
})

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsClient />
    </Suspense>
  )
}
