"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DemoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])

  return (
    <section id="demo" ref={containerRef} className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div style={{ scale, opacity }} className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              <span className="text-balance">See it in action</span>
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
              Watch how our platform transforms the way you track and evaluate candidate assessments.
            </p>
          </div>

          <div className="group relative aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
              <Button
                size="lg"
                className="h-20 w-20 rounded-full bg-white text-black transition-transform hover:scale-110 hover:bg-zinc-200"
              >
                <Play className="h-8 w-8 fill-current" />
              </Button>
            </div>
            {/* Placeholder for demo video */}
            <div className="absolute inset-0 bg-[url('/general-dashboard-interface.png')] bg-cover bg-center opacity-20" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
