import { Suspense } from 'react'
import CookingComponent from '@/components/CookingPage'

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function CookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading cooking page...</div>
      </div>
    }>
      <CookingComponent />
    </Suspense>
  )
} 