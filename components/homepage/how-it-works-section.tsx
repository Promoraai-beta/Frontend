"use client"

import { motion } from "framer-motion"

const steps = [
  {
    step: "STEP 01",
    time: "~30s",
    title: "Paste a JD.",
    description: "We parse the role, generate a unique assessment with VS Code, a real database, and live docs. Nothing leaks; nothing repeats.",
    illustration: (
      <div className="flex items-center gap-4">
        {/* JD file */}
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-20 rounded-full bg-background/20" />
          <div className="h-1.5 w-16 rounded-full bg-background/20" />
          <div className="h-1.5 w-20 rounded-full bg-background/20" />
          <div className="h-1.5 w-12 rounded-full bg-background/20" />
          <div className="h-1.5 w-16 rounded-full bg-background/20" />
          <p className="mt-2 font-mono text-[10px] text-background/40">JD.txt</p>
        </div>
        {/* Arrow */}
        <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
          <path d="M0 8H24M24 8L18 2M24 8L18 14" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {/* Unique badge */}
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-background/30">
          <span className="font-serif text-sm italic text-background/50">unique</span>
        </div>
      </div>
    ),
  },
  {
    step: "STEP 02",
    time: "60–90 min",
    title: "Candidate works with AI.",
    description: "They pick Claude, GPT, or Gemini. We watch every prompt, edit, and recovery — not the keystrokes, the reasoning.",
    illustration: (
      <div className="flex flex-col gap-2 w-full">
        {/* Traffic light dots */}
        <div className="flex gap-1.5 mb-1">
          <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
        </div>
        {/* Conversation lines */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] w-6 text-background/40">user</span>
          <div className="h-1.5 w-36 rounded-full bg-background/20" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] w-6 text-background/40">ai</span>
          <div className="h-1.5 w-28 rounded-full bg-background/15" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] w-6 text-background/40">user</span>
          <div className="h-1.5 w-20 rounded-full bg-background/20" />
        </div>
      </div>
    ),
  },
  {
    step: "STEP 03",
    time: "instant",
    title: "PromptIQ + verdict.",
    description: "A 0–100 score, five-dimension breakdown, agent-panel recommendation. Send it to the hiring manager. They'll get it.",
    illustration: (
      <div className="flex items-center gap-6">
        {/* Circular score */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 26 * 0.82} ${2 * Math.PI * 26}`} strokeLinecap="round" />
          </svg>
          <div className="text-center">
            <p className="font-serif text-base font-bold leading-none text-background">82</p>
            <p className="font-mono text-[8px] text-background/50">PROMPTIQ</p>
          </div>
        </div>
        {/* Score bars */}
        <div className="flex flex-col gap-2">
          <div className="h-1.5 w-24 rounded-full bg-background/25" />
          <div className="h-1.5 w-20 rounded-full bg-background/20" />
          <div className="h-1.5 w-28 rounded-full bg-background/25" />
          <div className="h-1.5 w-16 rounded-full bg-background/15" />
        </div>
      </div>
    ),
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative py-12 md:py-16">
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
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">HOW IT WORKS</span>
          </div>

          <h2 className="mb-4 font-serif text-4xl font-bold leading-[1.1] text-foreground md:text-5xl">
            From job description<br />
            to <em className="not-italic">defensible verdict.</em>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Three steps. No question banks, no rubric writing, no transcript reviewing. The whole loop runs in under 90 minutes per candidate.
          </p>
        </motion.div>

        {/* 3 step cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col rounded-2xl border border-foreground bg-foreground p-8"
            >
              {/* Step label */}
              <p className="mb-6 font-mono text-xs text-background/50">
                {step.step} · <span className="text-background/35">{step.time}</span>
              </p>

              {/* Title */}
              <h3 className="mb-4 font-serif text-3xl font-bold leading-tight text-background">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mb-10 text-sm leading-relaxed text-background/60">
                {step.description}
              </p>

              {/* Illustration */}
              <div className="mt-auto">
                {step.illustration}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
