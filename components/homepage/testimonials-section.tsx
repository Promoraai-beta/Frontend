"use client"

import { CircularTestimonials } from "@/components/ui/circular-testimonials"

const testimonials = [
  {
    quote:
      "PromoraAI has revolutionized how we evaluate candidates. We can finally see how developers think and iterate with AI tools, not just the final code they produce.",
    name: "Sarah Chen",
    designation: "Head of Engineering at TechCorp",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3540&auto=format&fit=crop",
  },
  {
    quote:
      "The PromptIQ scoring is a game-changer. We now hire developers who are truly proficient with AI, not just those who can hide their usage.",
    name: "Michael Rodriguez",
    designation: "CTO at InnovateLabs",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3540&auto=format&fit=crop",
  },
  {
    quote:
      "Being able to showcase my AI fluency has opened up so many opportunities. Recruiters now see me as an asset, not a risk.",
    name: "Emily Watson",
    designation: "Senior Developer",
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=3540&auto=format&fit=crop",
  },
  {
    quote:
      "The transparency and analytics are incredible. We've reduced our time-to-hire by 40% while improving candidate quality.",
    name: "James Kim",
    designation: "VP of Talent at DataPro",
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=3540&auto=format&fit=crop",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            <span className="text-balance">Trusted by leading teams</span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            Join hundreds of companies and developers who have embraced transparent AI evaluation.
          </p>
        </div>

        <CircularTestimonials
          testimonials={testimonials}
          autoplay={true}
          colors={{
            name: "#ffffff",
            designation: "#a1a1aa",
            testimony: "#d4d4d8",
            arrowBackground: "#18181b",
            arrowForeground: "#ffffff",
            arrowHoverBackground: "#3f3f46",
          }}
          fontSizes={{
            name: "28px",
            designation: "18px",
            quote: "18px",
          }}
        />
      </div>
    </section>
  )
}
