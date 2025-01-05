import { default as dynamicImport } from 'next/dynamic'

const CookingPage = dynamicImport(() => import('@/components/CookingPage'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <CookingPage />
} 