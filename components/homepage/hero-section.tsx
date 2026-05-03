"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SplineScene } from "@/components/ui/spline-scene"

const processSteps = [
  { label: "PROMPT SENT", x: "15%", y: "25%" },
  { label: "ITERATION", x: "75%", y: "20%" },
  { label: "PROMPTIQ", x: "80%", y: "70%" },
]

const statCards = [
  { label: "FOR", title: "Hiring teams", sub: "Talent & engineering" },
  { label: "SIGNAL", title: "One score", sub: "Across roles & tools" },
  { label: "AI", title: "Their pick", sub: "Claude · GPT · Gemini" },
  { label: "SETUP", title: "Minutes", sub: "Paste JD → live link" },
]

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])
  const y = useTransform(scrollYProgress, [0, 1], [0, 200])

  return (
    <div ref={containerRef} className="relative bg-background">
      {/* === SCREEN 1: Robot + headline, exactly as original === */}
      <div className="relative h-screen overflow-hidden">
        {/* Dot grid texture */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Spline robot — full background */}
        <div className="absolute inset-0 z-[2]">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
        </div>

        {/* Process flow labels — same positions as original */}
        {processSteps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 + i * 0.15 }}
            className="pointer-events-none absolute z-[4] hidden lg:block"
            style={{ left: step.x, top: step.y }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <span className="text-xs font-medium tracking-[0.2em] text-emerald-400/90">{step.label}</span>
            </div>
          </motion.div>
        ))}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-background/50 via-transparent to-background" />

        {/* Centered headline — vertically centered in the hero */}
        <motion.div
          style={{ opacity, scale, y }}
          className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6 max-w-4xl font-serif text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl lg:text-8xl"
          >
            <span className="text-balance">See how candidates</span>
            <br />
            <span className="text-balance">actually work with AI.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl"
          >
            One score, built from how they prompt, edit, and recover — not just whether the code compiled.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row"
          >
            <Button asChild size="lg" className="shadow-lg">
              <Link href="https://calendly.com/promoraai05/30min" target="_blank" rel="noopener noreferrer">Book a demo</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border bg-muted/30 backdrop-blur-sm text-foreground hover:bg-muted/50 hover:border-border"
            >
              <Link href="#report">See sample report</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center gap-3 text-xs font-semibold tracking-[0.15em] text-muted-foreground"
          >
            <span>JD-UNIQUE</span>
            <span className="opacity-30">·</span>
            <span>MULTI-LLM</span>
            <span className="opacity-30">·</span>
            <span>AGENT-WRITTEN VERDICT</span>
          </motion.div>
        </motion.div>

        {/* Stat cards — anchored to bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="absolute bottom-10 left-0 right-0 z-10 px-6 md:px-12"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border bg-card/60 p-5 text-left backdrop-blur-sm"
              >
                <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground">{card.label}</p>
                <p className="mb-0.5 font-serif text-xl font-bold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* === SCREEN 2: Video (below the fold) === */}
      <div className="relative z-10 container mx-auto px-4 pb-12 pt-4">


        {/* Report card */}
        <motion.div
          id="report"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          viewport={{ once: true }}
          className="w-full overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <div className="h-3 w-3 rounded-full bg-muted" />
              <div className="h-3 w-3 rounded-full bg-muted" />
            </div>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              candidate-report / full-stack-engineer.json
            </span>
            <span className="ml-auto rounded border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
              SAMPLE OUTPUT
            </span>
          </div>

          {/* Report body — two columns, big */}
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Left */}
            <div className="p-16">
              <h3 className="font-serif text-4xl font-bold text-foreground">M. Reyes</h3>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded border border-border px-2 py-1 font-mono text-xs text-muted-foreground">58 min</span>
                <span className="rounded border border-border px-2 py-1 font-mono text-xs text-muted-foreground">47 prompts</span>
                <span className="rounded border border-border px-2 py-1 font-mono text-xs text-muted-foreground">3 LLMs</span>
              </div>

              <p className="mb-2 mt-10 text-xs font-semibold tracking-[0.12em] text-muted-foreground">PROMPTIQ SCORE</p>
              <div className="flex items-end gap-2">
                <span className="font-serif text-[120px] font-bold leading-none text-foreground">78</span>
                <span className="mb-4 font-mono text-xl text-muted-foreground">/100</span>
              </div>

              <div className="mt-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold tracking-wider text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  HIRE — LOW RISK
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="p-16">
              <div className="space-y-6">
                {[
                  { label: "Scaffolding quality", score: 82 },
                  { label: "Debugging skill", score: 74 },
                  { label: "Hallucination recovery", score: 91 },
                  { label: "Optimisation thinking", score: 65 },
                  { label: "Testing approach", score: 70 },
                ].map((dim) => (
                  <div key={dim.label} className="flex items-center gap-4">
                    <span className="w-52 shrink-0 text-base text-muted-foreground">{dim.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-muted/40">
                      <div className="h-2.5 rounded-full bg-foreground/80" style={{ width: `${dim.score}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-base font-medium text-foreground">{dim.score}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-xl border border-border bg-muted/20 p-6">
                <p className="text-base leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Agent verdict — </span>
                  Caught 2 hallucinated API calls and self-corrected without prompting. Iterative, specific prompts — not vague asks. Strong instinct for where AI breaks down.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
