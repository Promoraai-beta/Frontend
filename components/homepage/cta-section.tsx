"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      {/* Radial glow from top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent" />

      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-6 font-serif text-5xl font-bold leading-[1.1] text-foreground md:text-7xl">
            The score is the product.
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground">
            Book a 20-minute demo. We'll generate a fresh assessment from a real JD on the call.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 shadow-lg">
              <Link href="https://calendly.com/promoraai05/30min" target="_blank" rel="noopener noreferrer">Book a demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 border-border bg-muted/30 backdrop-blur-sm text-foreground hover:bg-muted/50">
              <Link href="#report">See sample report</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
