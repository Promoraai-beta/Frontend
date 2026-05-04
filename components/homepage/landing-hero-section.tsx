"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SplineScene } from "@/components/ui/spline-scene"

const processSteps = [
  { label: "PROMPT SENT", x: "15%", y: "28%" },
  { label: "ITERATION",   x: "74%", y: "22%" },
  { label: "PROMPTIQ",    x: "78%", y: "68%" },
]

export function LandingHeroSection() {
  const cardRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start start", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])
  const scale   = useTransform(scrollYProgress, [0, 0.45], [1, 0.94])
  const y       = useTransform(scrollYProgress, [0, 1],    [0, 140])

  return (
    /*
      Outer wrapper — the void-black page background.
      Padding on ALL sides (including bottom) so the card
      floats with equal gaps on left, right, top AND bottom,
      exactly like the Glean reference.
    */
    <div style={{ background: "#14112a", padding: "76px 20px 20px" }}>
      {/*
        The hero card.
        Height = viewport - navbar (≈60px) - top gap (12px) - bottom gap (12px) - 2px breathing room
        So the bottom rounded edge is always visible in the viewport on load.
      */}
      <div
        ref={cardRef}
        style={{
          position: "relative",
          height: "78svh",
          minHeight: 480,
          borderRadius: 20,
          overflow: "hidden",
          background: "#05030d",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Spline scene — fills the whole card */}
        <div className="absolute inset-0 z-[2]">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="h-full w-full"
          />
        </div>

        {/* Floating process labels */}
        {processSteps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.9 + i * 0.15 }}
            className="pointer-events-none absolute z-[4] hidden lg:block"
            style={{ left: step.x, top: step.y }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-400/90 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
              <span className="text-[11px] font-medium tracking-[0.18em] text-violet-300/80">
                {step.label}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Hero copy */}
        <motion.div
          style={{ opacity, scale, y }}
          className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6 font-serif font-bold leading-[1.05] tracking-tight text-white"
            style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)" }}
          >
            Evaluate AI Fluency,
            <br />
            Not Just Code Output
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.38 }}
            className="mb-8 max-w-2xl text-pretty text-lg md:text-xl"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            The first platform that celebrates, tracks, and scores{" "}
            <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
              how well
            </span>{" "}
            candidates use AI tools across any role.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.54 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              style={{
                background: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                boxShadow: "0 0 28px rgba(139,92,246,0.45)",
                fontSize: "1rem",
                padding: "0 2rem",
              }}
            >
              <Link href="/auth?tab=signup">Start Free Assessment →</Link>
            </Button>
            <Button
              asChild
              size="lg"
              style={{
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(255,255,255,0.15)",
                fontWeight: 500,
                fontSize: "1rem",
                padding: "0 2rem",
                backdropFilter: "blur(8px)",
              }}
            >
              <Link href="#demo">See How It Works</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Bottom vignette — fades the robot into the card edge */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5]"
          style={{
            height: "35%",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(13,10,26,0.85) 100%)",
          }}
        />

        {/* Top-center soft light bloom */}
        <div
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(139,92,246,0.07) 0%, transparent 65%)",
          }}
        />
      </div>
    </div>
  )
}
