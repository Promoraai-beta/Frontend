"use client"

import { motion } from "framer-motion"
import { GitBranch, Flag, GitCommit, TrendingUp } from "lucide-react"

const features = [
  {
    icon: GitCommit,
    title: "Prompt Timeline Tracking",
    description:
      "Capture every prompt, iteration, and refinement. See how candidates craft effective prompts and improve over time.",
  },
  {
    icon: GitBranch,
    title: "Code Evolution Viewer",
    description: "Visualize how code changes between AI suggestions. Track original logic mixed with AI output.",
  },
  {
    icon: Flag,
    title: "AI Sanity Flagging",
    description:
      "Identify when candidates catch AI hallucinations and buggy output. Measure recovery and debugging skills.",
  },
  {
    icon: TrendingUp,
    title: "PromptIQ Scoring",
    description: "Composite score measuring AI fluency across scaffolding, debugging, optimization, and testing.",
  },
]

export function AboutSection() {
  return (
    <section id="features" className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">
            Track the Process, Not Just the Output
          </h2>
          <p className="mx-auto max-w-xl text-zinc-400">
            Four core capabilities that set us apart.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                <feature.icon className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-zinc-500">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
