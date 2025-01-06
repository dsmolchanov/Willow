import { Suspense } from 'react'
import { dynamicImport } from '@/lib/dynamic-import'

const CookingComponent = dynamicImport(
  () => import('@/components/CookingPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading cooking page...</div>
      </div>
    ),
  }
)

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