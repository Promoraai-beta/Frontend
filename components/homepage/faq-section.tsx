"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X } from "lucide-react"

const faqs = [
  {
    q: "Why bet on you over HackerRank or CodeSignal?",
    a: "Don't, on faith. Run us side-by-side for one role and compare scorecards. If our score doesn't predict day-30 productivity better than your incumbent's, walk — no contract, no hard feelings.",
  },
  {
    q: "Which AI can candidates use?",
    a: "Any. Claude, GPT-4o, Gemini, Copilot — whatever they use on the job. We're deliberately model-agnostic. Locking candidates to one tool would corrupt the signal we're trying to measure.",
  },
  {
    q: "How is this not Cosmo with a new name?",
    a: "Cosmo is a copilot inside CodeSignal's IDE — it assists during the test and generates a rubric. We don't assist. We observe. The candidate works with their own AI, and we score the quality of that interaction, not the output.",
  },
  {
    q: "Can candidates cheat by using AI in another tab?",
    a: "Yes — and that's the point. We expect candidates to use AI. We're measuring how well they use it, not whether they use it. Tab-switching is logged but not penalised. The score reflects the interaction quality, not compliance.",
  },
  {
    q: "SOC 2? GDPR? Data residency?",
    a: "SOC 2 Type II audit in progress, expected Q3 2026. GDPR-compliant data processing with EU residency option. DPA available on request. Enterprise customers get a full security review before signing.",
  },
  {
    q: "Which roles can I assess today?",
    a: "Software engineering roles — full-stack, backend, frontend, ML. We generate JD-specific assessments for any engineering role in under 4 minutes. Data & ML roles in beta. Product and design roles on the roadmap.",
  },
  {
    q: "What does this cost?",
    a: "We price per assessment, not per seat. Early teams get flat-rate pilots. Book a demo and we'll scope something that fits your hiring volume — no six-figure contracts to start.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="relative py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header — centered */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">FAQ</span>
          </div>

          <h2 className="mb-4 font-serif text-5xl font-bold leading-[1.1] text-foreground md:text-6xl">
            The <em className="not-italic text-muted-foreground">uncomfortable</em> ones.
          </h2>
          <p className="text-base text-muted-foreground">
            The questions hiring leaders actually ask in the second meeting.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl space-y-3"
        >
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-card/60 cursor-pointer"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {/* Question row */}
              <div className="flex items-center justify-between px-6 py-5">
                <span className="text-base font-medium text-foreground">{faq.q}</span>
                <button className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  openIndex === i
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-transparent text-muted-foreground"
                }`}>
                  {openIndex === i ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Answer */}
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
