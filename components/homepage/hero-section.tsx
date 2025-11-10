"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SplineScene } from "@/components/ui/spline-scene"

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
    <div ref={containerRef} className="relative h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-[2]">
        <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
      </div>

      <motion.div
        style={{ opacity, scale, y }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl lg:text-8xl"
        >
          <span className="text-balance">Evaluate AI Fluency,</span>
          <br />
          <span className="text-balance">Not Just Code Output</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8 max-w-3xl text-pretty text-lg text-zinc-400 md:text-xl"
        >
          The first platform that celebrates, tracks, and scores{" "}
          <span className="font-semibold text-white">how well</span> developers use AI tools. Measure prompt quality,
          iteration depth, and engineering maturity in the age of AI.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild size="lg" className="bg-white text-black hover:bg-zinc-200">
            <Link href="/register">Start Free Assessment</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
          >
            <Link href="#demo">See How It Works</Link>
          </Button>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-black/40 via-transparent to-black" />
    </div>
  )
}
