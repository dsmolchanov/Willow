"use client"

import { Suspense } from "react"

function NotFoundContent() {
  // Your existing 404 page content
  return (
    <div>
      {/* Your 404 content */}
    </div>
  )
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  )
} 