import Hero from '@/components/Hero'
import Problem from '@/components/Problem'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import CTA from '@/components/CTA'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Problem />
      <Features />
      <Pricing />
      <CTA />
    </main>
  )
}
