import { default as dynamicImport } from 'next/dynamic'

const DashboardComponent = dynamicImport(
  () => import('@/components/DashboardPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading dashboard...</div>
      </div>
    ),
  }
)

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

// Disable static page generation
export const generateStaticParams = () => {
  return []
}

export default function DashboardPage() {
  return <DashboardComponent />
} 