"use client"

import { Suspense } from "react"
import { default as dynamicImport } from 'next/dynamic'

// Dynamically import the InteractiveAvatar component
const InteractiveAvatarComponent = dynamicImport(
  () => import('@/components/InteractiveAvatar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center min-h-screen">
        <div>Loading avatar interface...</div>
      </div>
    ),
  }
)

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function InteractiveAvatarPage() {
  return <InteractiveAvatarComponent />
}