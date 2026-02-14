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
    <div ref={containerRef} className="relative h-screen overflow-hidden bg-background">
      {/* Subtle grid texture - Tsenta/Bujo style - theme-aware */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 z-[2]">
        <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
      </div>

      {/* Process flow labels - Cardinal style */}
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

      <motion.div
        style={{ opacity, scale, y }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 font-serif text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl lg:text-8xl"
        >
          <span className="text-balance">Evaluate AI Fluency,</span>
          <br />
          <span className="text-balance">Not Just Code Output</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8 max-w-3xl text-pretty text-lg text-muted-foreground md:text-xl"
        >
          The first platform that celebrates, tracks, and scores{" "}
          <span className="font-semibold text-foreground">how well</span> candidates use AI tools across any role.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild size="lg" className="shadow-lg">
            <Link href="/register">Start Free Assessment</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-border bg-muted/30 backdrop-blur-sm text-foreground hover:bg-muted/50 hover:border-border"
          >
            <Link href="#demo">See How It Works</Link>
          </Button>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-background/50 via-transparent to-background" />
    </div>
  )
}
