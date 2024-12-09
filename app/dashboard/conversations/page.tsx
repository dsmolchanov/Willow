"use client"

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const ConversationsClient = dynamic(
  () => import('@/components/ConversationsPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    )
  }
)

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsClient />
    </Suspense>
  )
} 