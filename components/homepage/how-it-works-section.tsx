"use client"

import { motion } from "framer-motion"
import { FileCode, LineChart, Award, Share2 } from "lucide-react"

const steps = [
  {
    icon: FileCode,
    title: "Complete Assessment",
    description: "Candidates use their preferred AI tools — coding, writing, analysis, or decision-making.",
  },
  {
    icon: LineChart,
    title: "We Track",
    description: "Every prompt, edit, and AI interaction is captured automatically.",
  },
  {
    icon: Award,
    title: "PromptIQ Generated",
    description: "Your AI fluency score is computed from the full session.",
  },
  {
    icon: Share2,
    title: "Share Portfolio",
    description: "Get a shareable profile and insights for applications.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-xl text-zinc-400">
            From assessment to insights in four simple steps
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                <step.icon className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="mb-2 font-semibold text-white">{step.title}</h3>
              <p className="text-sm text-zinc-500">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
