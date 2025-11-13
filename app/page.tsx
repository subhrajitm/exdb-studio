import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import TabsSection from '@/components/TabsSection'
import CTA from '@/components/CTA'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black">
      <Header />
      <div className="relative z-10">
        <Hero />
        <Features />
        <TabsSection />
        <CTA />
        <Footer />
      </div>
    </div>
  )
}

