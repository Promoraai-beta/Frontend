"use client"

import { motion } from "framer-motion"
import { Check, History, User, Plug } from "lucide-react"

const items = [
  {
    icon: User,
    title: "Candidate portfolio",
    promora: "Shareable profile showcasing AI fluency for employers",
    others: "Recruiter-only view",
  },
  {
    icon: Plug,
    title: "Any AI, any role",
    promora: "Use ChatGPT, Copilot, Claude — tool-agnostic. Coding, writing, analysis.",
    others: "Built-in AI only; coding-focused",
  },
  {
    icon: History,
    title: "No prompt caps",
    promora: "Full timeline captured — no limits on prompts per assessment",
    others: "~30 prompts or sampling",
  },
]

export function ComparisonSection() {
  return (
    <section id="compare" className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">
            Why PromoraAI
          </h2>
          <p className="mx-auto max-w-xl text-zinc-400">
            Built for the age of AI. Built different.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 transition-colors hover:border-zinc-700"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80">
                  <item.icon className="h-5 w-5 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <p className="text-sm text-zinc-300">{item.promora}</p>
                </div>
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-3 py-2">
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-600">Others:</span> {item.others}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
