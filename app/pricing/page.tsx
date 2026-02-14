"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Check } from "lucide-react"
import { Navbar } from "@/components/homepage/navbar"
import { Footer } from "@/components/homepage/footer"
import { BackgroundPaths } from "@/components/ui/background-paths"

const candidatePlans = [
  {
    name: "Candidate",
    tier: "Free",
    price: "Free",
    period: "",
    description: "Build your AI-fluency portfolio and stand out to employers",
    features: [
      "3 self-assessments per month",
      "PromptIQ scoring",
      "AI interaction tracking",
      "Personal portfolio and analytics",
      "Share your profile with employers",
    ],
    cta: "Get Started Free",
    ctaLink: "/register",
  },
  {
    name: "Candidate Pro",
    tier: "Pro",
    price: "$9",
    period: "per month",
    description: "For serious candidates who want to ace their AI-fluency",
    features: [
      "15 self-assessments per month",
      "Advanced PromptIQ analytics",
      "Priority portfolio visibility",
      "Export reports for applications",
      "History and progress tracking",
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/register",
  },
]

const recruiterPlans = [
  {
    name: "Recruiter",
    tier: "Starter",
    price: "$149",
    period: "per month",
    description: "Assess candidates with AI-fluency insights",
    features: [
      "Up to 50 candidate assessments/month",
      "PromptIQ scoring",
      "Real-time monitoring",
      "Detailed candidate reports",
      "Video recordings and session replay",
      "AI violation detection",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/register",
  },
  {
    name: "Recruiter Pro",
    tier: "Pro",
    price: "$299",
    period: "per month",
    description: "For teams hiring at scale",
    features: [
      "Up to 150 candidate assessments/month",
      "Advanced PromptIQ analytics",
      "Team seats and collaboration",
      "Custom assessment templates",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/register",
  },
]

type Tab = "candidate" | "recruiter"

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("candidate")

  const plans = activeTab === "candidate" ? candidatePlans : recruiterPlans

  return (
    <main className="min-h-screen bg-black relative">
      <div className="fixed inset-0 z-0">
        <BackgroundPaths />
      </div>

      <div className="relative z-10">
        <Navbar />
        <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-12 text-center"
            >
              <h1 className="mb-4 text-5xl font-bold text-white md:text-6xl lg:text-7xl">
                Simple Pricing
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-zinc-400">
                Choose the plan that fits you. Start free or upgrade when you're ready.
              </p>
            </motion.div>

            {/* Tab switcher */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 flex justify-center"
            >
              <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
                <button
                  onClick={() => setActiveTab("candidate")}
                  className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                    activeTab === "candidate"
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Candidates
                </button>
                <button
                  onClick={() => setActiveTab("recruiter")}
                  className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                    activeTab === "recruiter"
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Recruiters
                </button>
              </div>
            </motion.div>

            {/* Plans grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
              >
                {plans.map((plan, index) => (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="relative rounded-3xl border border-zinc-800 bg-zinc-950 p-8"
                  >
                    <div className="mb-8">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                        {plan.tier}
                      </span>
                      <h3 className="mb-2 text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="mb-6 text-sm text-zinc-400">{plan.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white">{plan.price}</span>
                        {plan.period && <span className="text-zinc-400">{plan.period}</span>}
                      </div>
                    </div>
                    <ul className="mb-8 space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-white" />
                          <span className="text-sm text-zinc-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      size="lg"
                      variant={plan.price === "Free" ? "outline" : "default"}
                      className={`w-full ${
                        plan.price === "Free"
                          ? "border-zinc-700 bg-transparent text-white hover:bg-zinc-800"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      <Link href={plan.ctaLink || "/register"}>{plan.cta}</Link>
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 text-center"
            >
              <p className="text-sm text-zinc-400">
                Candidates: 3 free assessments/month. Recruiters: 14-day free trial. No credit card required.
              </p>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    </main>
  )
}
