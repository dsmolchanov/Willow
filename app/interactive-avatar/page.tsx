"use client"

import { Suspense } from "react"
import dynamic from 'next/dynamic'

// Dynamically import the InteractiveAvatar component
const InteractiveAvatarComponent = dynamic(
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

export default function InteractiveAvatarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InteractiveAvatarComponent />
    </Suspense>
  )
}