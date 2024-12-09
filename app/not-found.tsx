"use client"

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const NotFoundClient = dynamic(
  () => import('@/components/NotFoundPage'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }
)

export default function NotFoundPage() {
  return (
    <Suspense>
      <NotFoundClient />
    </Suspense>
  )
} 