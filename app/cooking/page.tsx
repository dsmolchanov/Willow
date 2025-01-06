import { default as dynamicImport } from 'next/dynamic'

const CookingPage = dynamicImport(() => import('@/components/CookingPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-white">Loading...</div>
    </div>
  )
})

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <CookingPage />
} 