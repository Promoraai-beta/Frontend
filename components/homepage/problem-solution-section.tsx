"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Lightbulb } from "lucide-react"

export function ProblemSolutionSection() {
  return (
    <section className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">The AI Hiring Paradox</h2>
          <p className="mx-auto max-w-3xl text-pretty text-lg text-zinc-400">
            Developers skilled at using AI tools are penalized for it. We solve this by evaluating{" "}
            <span className="font-semibold text-white">how well</span> they use AI, not just{" "}
            <span className="font-semibold text-white">if</span> they use it.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Problem - removed hover effects */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-orange-900/30 bg-gradient-to-br from-orange-950/20 to-zinc-950 p-8"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex rounded-lg bg-orange-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">The Problem</h3>
            </div>
            <ul className="flex-1 space-y-3 text-zinc-400">
              <li className="flex gap-2">
                <span className="text-orange-400">×</span>
                <span>Recruiters lose trust when AI involvement is detected</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">×</span>
                <span>No way to measure AI fluency or prompt crafting skills</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">×</span>
                <span>Developers hide AI usage, creating dishonest evaluations</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-400">×</span>
                <span>Best AI-assisted developers are penalized</span>
              </li>
            </ul>
          </motion.div>

          {/* Solution - removed hover effects */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-blue-900/30 bg-gradient-to-br from-blue-950/20 to-zinc-950 p-8"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex rounded-lg bg-blue-500/10 p-3">
                <Lightbulb className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Our Solution</h3>
            </div>
            <ul className="flex-1 space-y-3 text-zinc-400">
              <li className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span>Track prompt quality, iteration, and AI recovery patterns</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span>Generate PromptIQ scores showing true AI fluency</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span>Celebrate transparent AI usage with detailed analytics</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">✓</span>
                <span>Reward engineering maturity in the age of AI</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
