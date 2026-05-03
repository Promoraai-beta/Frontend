"use client"

import { motion } from "framer-motion"
import { AlignLeft, Search, Star, TrendingUp, FlaskConical } from "lucide-react"

const dimensions = [
  {
    number: "01",
    icon: AlignLeft,
    title: "Scaffolding quality",
    description: "Do they break the problem down before prompting — or fire blindly?",
  },
  {
    number: "02",
    icon: Search,
    title: "Debugging skill",
    description: "When AI gets it wrong, do they isolate the cause or paste the same prompt again?",
  },
  {
    number: "03",
    icon: Star,
    title: "Hallucination recovery",
    description: "Do they catch fabricated APIs, missing imports, false confidence?",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Optimisation thinking",
    description: "Do they push past the first working answer toward better ones?",
  },
  {
    number: "05",
    icon: FlaskConical,
    title: "Testing approach",
    description: "Are tests deliberate and meaningful — or copy-pasted to satisfy coverage?",
  },
]

export function PromptIQSection() {
  return (
    <section id="promptiq" className="relative py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header — left aligned */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8 max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">PROMPTIQ · 5 DIMENSIONS</span>
          </div>

          <h2 className="mb-4 font-serif text-4xl font-bold leading-[1.1] text-foreground md:text-5xl">
            One score. Five honest signals.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            What we measure, in plain language. No proprietary black box — every dimension explainable to a hiring manager in one sentence.
          </p>
        </motion.div>

        {/* 5 dimension cards */}
        <div className="grid gap-3 md:grid-cols-5">
          {dimensions.map((dim, index) => (
            <motion.div
              key={dim.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-border/80"
            >
              {/* Icon */}
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60">
                <dim.icon className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Number */}
              <p className="mb-2 font-mono text-xs text-muted-foreground">{dim.number}</p>

              {/* Title */}
              <h3 className="mb-3 font-serif text-lg font-bold leading-snug text-foreground">{dim.title}</h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">{dim.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
