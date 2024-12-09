"use client"

import { Suspense } from "react"
import InteractiveAvatar from '@/components/InteractiveAvatar';

function InteractiveAvatarContent() {
  return <InteractiveAvatar />;
}

export default function InteractiveAvatarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InteractiveAvatarContent />
    </Suspense>
  )
}