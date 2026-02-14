"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Lightbulb, ArrowRight } from "lucide-react"

const problemItems = [
  "Recruiters lose trust when AI involvement is detected",
  "No way to measure AI fluency or prompt crafting skills",
  "Candidates hide AI usage, creating dishonest evaluations",
  "Best AI-assisted candidates are penalized",
]

const solutionItems = [
  "Track prompt quality, iteration, and AI recovery patterns",
  "Score AI fluency — not just code correctness",
  "Celebrate transparent AI usage with detailed analytics",
  "Reward professional maturity in the age of AI",
]

export function ProblemSolutionSection() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      {/* Dramatic gradient orbs */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
          className="mb-24 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-emerald-500/80">
            The shift
          </p>
          <h2 className="mb-6 font-serif text-4xl font-bold text-white md:text-6xl lg:text-7xl">
            The AI Hiring Paradox
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-zinc-400">
            Candidates skilled at using AI tools are penalized for it. We flip the script by evaluating{" "}
            <span className="font-semibold text-white">how well</span> they use AI, not just{" "}
            <span className="font-semibold text-white">if</span> they use it.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
            {/* Problem - dramatic card */}
            <motion.div
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-950/60 via-zinc-950 to-zinc-950/95 p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_80px_-20px_rgba(249,115,22,0.3)] backdrop-blur-sm lg:p-12"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(249,115,22,0.08),transparent)]" />
              <div className="relative">
                <div className="mb-10 flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/20 shadow-lg shadow-orange-500/10">
                    <AlertTriangle className="h-8 w-8 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400/90">Before</p>
                    <h3 className="text-3xl font-bold text-white">The Problem</h3>
                  </div>
                </div>
                <ul className="space-y-6">
                  {problemItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex gap-4"
                    >
                      <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/25 text-orange-400">×</span>
                      <span className="text-lg text-zinc-300">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Center arrow - transformation */}
            <div className="hidden items-center justify-center lg:flex lg:px-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.2)]"
              >
                <ArrowRight className="h-8 w-8 text-emerald-400" />
              </motion.div>
            </div>

            {/* Solution - dramatic card */}
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-bl from-emerald-950/50 via-zinc-950 to-zinc-950/95 p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_80px_-20px_rgba(52,211,153,0.3)] backdrop-blur-sm lg:p-12"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(52,211,153,0.08),transparent)]" />
              <div className="relative">
                <div className="mb-10 flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <Lightbulb className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400/90">After</p>
                    <h3 className="text-3xl font-bold text-white">Our Solution</h3>
                  </div>
                </div>
                <ul className="space-y-6">
                  {solutionItems.map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex gap-4"
                    >
                      <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/25">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-lg text-zinc-300">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
