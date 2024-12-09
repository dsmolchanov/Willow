import { default as dynamicImport } from 'next/dynamic'

const HomePage = dynamicImport(() => import('@/components/HomePage'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <HomePage />
}