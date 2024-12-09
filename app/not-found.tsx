"use client"

import { Suspense } from 'react'
import Link from 'next/link'

function NotFoundContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="mb-4 text-2xl font-bold">Page Not Found</h2>
      <p className="mb-4 text-gray-600">The page you're looking for doesn't exist.</p>
      <Link
        href="/"
        className="text-blue-600 hover:text-blue-800"
      >
        Go back home
      </Link>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundContent />
    </Suspense>
  )
} 