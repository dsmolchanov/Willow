import { default as dynamicImport } from 'next/dynamic'

const BuddhaPage = dynamicImport(() => import('@/components/BuddhaPage'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <BuddhaPage />
} 