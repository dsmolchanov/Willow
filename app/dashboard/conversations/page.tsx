"use client"

import { default as dynamicImport } from 'next/dynamic'

const ConversationsComponent = dynamicImport(
  () => import('@/components/ConversationsPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    ),
  }
)

export default function ConversationsPage() {
  return <ConversationsComponent />
} 