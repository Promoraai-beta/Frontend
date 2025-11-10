"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { GitBranch, Flag, GitCommit, TrendingUp } from "lucide-react"

const features = [
  {
    icon: GitCommit,
    title: "Prompt Timeline Tracking",
    description:
      "Capture every prompt, iteration, and refinement. See how candidates craft effective prompts and improve over time.",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: GitBranch,
    title: "Code Evolution Viewer",
    description: "Visualize how code changes between AI suggestions. Track original logic mixed with AI output.",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Flag,
    title: "AI Sanity Flagging",
    description:
      "Identify when candidates catch AI hallucinations and buggy output. Measure recovery and debugging skills.",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: TrendingUp,
    title: "PromptIQ Scoring",
    description: "Composite score measuring AI fluency across scaffolding, debugging, optimization, and testing.",
    gradient: "from-orange-500/20 to-amber-500/20",
  },
]

export function AboutSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <section ref={containerRef} className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            <span className="text-balance">Track the Process,</span>
            <br />
            <span className="text-balance">Not Just the Output</span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            PromoraAI captures your entire AI-assisted development journey, from first prompt to final solution.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900">
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <div className="relative z-10">
                  <div className="mb-4 inline-flex rounded-xl bg-white p-3">
                    <feature.icon className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="text-pretty text-zinc-400">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
