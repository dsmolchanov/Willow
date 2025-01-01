import { default as dynamicImport } from 'next/dynamic'
import HeroSection from "@/components/HeroSection";
import WhoNeedsThisSection from "@/components/WhoNeedsThisSection";
import { Footer } from '@/components/Footer';

const HomePage = dynamicImport(() => import('@/components/HomePage'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function Page() {
  return <HomePage />
}