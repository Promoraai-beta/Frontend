import { Navbar } from "@/components/homepage/navbar"
import { HeroSection } from "@/components/homepage/hero-section"
import { ProblemSolutionSection } from "@/components/homepage/problem-solution-section"
import { AboutSection } from "@/components/homepage/about-section"
import { ComparisonSection } from "@/components/homepage/comparison-section"
import { HowItWorksSection } from "@/components/homepage/how-it-works-section"
// import { UseCasesSection } from "@/components/homepage/use-cases-section" // Hidden
import { DemoSection } from "@/components/homepage/demo-section"
import { FaqSection } from "@/components/homepage/faq-section"
// import { TestimonialsSection } from "@/components/homepage/testimonials-section" // Hidden for now - testimonials are not real yet
// import { ContactSection } from "@/components/homepage/contact-section" // Hidden for now - contact form not active yet
// import { BlogSection } from "@/components/homepage/blog-section" // Hidden for future use
import { Footer } from "@/components/homepage/footer"
import { BackgroundLines } from "@/components/ui/background-lines"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background relative">
      {/* Base: subtle dot pattern (Bujo/Tsenta style) - theme-aware */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="pointer-events-none fixed inset-0 z-0">
        <BackgroundLines className="h-full w-full" svgOptions={{ duration: 12 }} />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProblemSolutionSection />
        <AboutSection />
        <ComparisonSection />
        <HowItWorksSection />
        {/* <UseCasesSection /> Hidden */}
        <DemoSection />
        <FaqSection />
        {/* <TestimonialsSection /> Hidden until we have real testimonials */}
        {/* <ContactSection /> Hidden until contact form is live */}
        {/* <BlogSection /> Hidden for future use */}
        <Footer />
      </div>
    </main>
  )
}
