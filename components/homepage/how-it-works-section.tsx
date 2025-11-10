"use client"

import { motion } from "framer-motion"
import { FileCode, LineChart, Award, Share2 } from "lucide-react"

const steps = [
  {
    icon: FileCode,
    title: "Candidate Completes Assessment",
    description: "Developer solves coding challenges using their preferred AI tools like ChatGPT, Copilot, or Claude.",
    number: "01",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: LineChart,
    title: "AI Usage is Tracked",
    description: "We capture prompts, iterations, code evolution, and how they handle AI errors and hallucinations.",
    number: "02",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Award,
    title: "PromptIQ Score Generated",
    description: "Algorithm evaluates prompt quality, iteration depth, debugging skills, and original thinking.",
    number: "03",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
  {
    icon: Share2,
    title: "Portfolio + Analytics Shared",
    description: "Candidate gets a GitHub-like profile showcasing their AI fluency and engineering process.",
    number: "04",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative bg-gradient-to-b from-black via-zinc-950 to-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">How It Works</h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            From assessment to insights in four simple steps
          </p>
        </motion.div>

        <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Connecting line */}
          <div className="absolute left-0 top-16 hidden h-0.5 w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent lg:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-white/5">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="rounded-xl bg-white p-3">
                      <step.icon className="h-6 w-6 text-black" />
                    </div>
                    <span className="text-5xl font-bold text-zinc-700">{step.number}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-pretty text-sm text-zinc-400">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
