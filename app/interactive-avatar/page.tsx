"use client"

import { Suspense } from "react"
import dynamic from 'next/dynamic'

const InteractiveAvatar = dynamic(() => import('@/components/InteractiveAvatar'), {
  ssr: false,
  loading: () => <div>Loading avatar...</div>
})

function InteractiveAvatarContent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InteractiveAvatar />
    </Suspense>
  )
}

export default function InteractiveAvatarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InteractiveAvatarContent />
    </Suspense>
  )
}