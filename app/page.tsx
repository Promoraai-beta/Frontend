import { Navbar } from "@/components/homepage/navbar"
import { HeroSection } from "@/components/homepage/hero-section"
import { ProblemSolutionSection } from "@/components/homepage/problem-solution-section"
import { AboutSection } from "@/components/homepage/about-section"
import { HowItWorksSection } from "@/components/homepage/how-it-works-section"
import { UseCasesSection } from "@/components/homepage/use-cases-section"
import { DemoSection } from "@/components/homepage/demo-section"
import { TestimonialsSection } from "@/components/homepage/testimonials-section"
import { ContactSection } from "@/components/homepage/contact-section"
// import { BlogSection } from "@/components/homepage/blog-section" // Hidden for future use
import { Footer } from "@/components/homepage/footer"
import { BackgroundPaths } from "@/components/ui/background-paths"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black relative">
      <div className="fixed inset-0 z-0">
        <BackgroundPaths />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProblemSolutionSection />
        <AboutSection />
        <HowItWorksSection />
        <UseCasesSection />
        <DemoSection />
        <TestimonialsSection />
        <ContactSection />
        {/* <BlogSection /> Hidden for future use */}
        <Footer />
      </div>
    </main>
  )
}
