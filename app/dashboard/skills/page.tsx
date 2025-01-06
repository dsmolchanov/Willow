import { dynamicImport } from '@/lib/dynamic-import'

const SkillsComponent = dynamicImport(
  () => import('@/components/SkillsPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading skills...</div>
      </div>
    ),
  }
)

// Force dynamic rendering and edge runtime
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function SkillsPage() {
  return <SkillsComponent />
}