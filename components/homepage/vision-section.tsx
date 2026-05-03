"use client"

import { motion } from "framer-motion"

const stages = [
  {
    label: "NOW",
    active: true,
    title: "Engineering",
    description: "Software engineers — full-stack, backend, frontend. Anyone shipping code with AI.",
  },
  {
    label: "NEXT",
    active: false,
    title: "Data & ML",
    description: "Data scientists and ML engineers. AI-assisted analysis is already table stakes.",
  },
  {
    label: "SOON",
    active: false,
    title: "Product & Design",
    description: "PMs writing specs with Claude. Designers using AI for research, iteration, prototyping.",
  },
  {
    label: "FUTURE",
    active: false,
    title: "Every role",
    description: "One platform for every hire in your org. AI fluency, scored — wherever AI is part of the job.",
  },
]

export function VisionSection() {
  return (
    <section id="vision" className="relative py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header — centered */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">THE VISION</span>
          </div>

          <h2 className="mb-6 font-serif text-5xl font-bold leading-[1.1] text-foreground md:text-7xl">
            Engineering now.<br />
            <em className="not-italic text-muted-foreground">All roles, soon.</em>
          </h2>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
            AI fluency isn't an engineering problem. It's a hiring problem for every role that ships with AI. We're starting where the signal is clearest — and the stakes are highest.
          </p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Horizontal connector line */}
          <div className="absolute left-0 right-0 top-[52px] h-px bg-border" />

          <div className="grid grid-cols-4 gap-0">
            {stages.map((stage, i) => (
              <div key={stage.label} className="relative pr-8">
                {/* Stage label badge */}
                <div className="mb-4 inline-block">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.12em] ${
                    stage.active
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground"
                  }`}>
                    {stage.label}
                  </span>
                </div>

                {/* Dot */}
                <div className="relative mb-8 flex items-center">
                  <div className={`h-4 w-4 rounded-full border-2 ${
                    stage.active
                      ? "border-foreground bg-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  }`} />
                </div>

                {/* Title */}
                <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">
                  {stage.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
