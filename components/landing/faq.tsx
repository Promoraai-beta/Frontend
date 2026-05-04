"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

const faqs = [
  {
    q: "Why bet on you over HackerRank or CodeSignal?",
    a: "They were built to score code. We were built to score how someone works with AI. Different product, different signal. If you only need to know whether a candidate can solve a leetcode problem, use them. If you need to know whether they can ship with AI as a teammate — and you want that in writing — that's us.",
  },
  {
    q: "Which AI can candidates use?",
    a: "Any of them. Claude, ChatGPT, Gemini, Copilot — whatever they use at work. Forcing candidates into a single tool tells you how they adapt to a constraint, not how they actually work.",
  },
  {
    q: "How is this not just Cosmo with a new name?",
    a: "Cosmo evaluates code output. We evaluate the human in the loop — the prompts, the recoveries, the judgment between attempts. Different layer, different question.",
  },
  {
    q: "Can candidates cheat by using AI in another tab?",
    a: "AI in another tab isn't cheating here — it's the point. Candidates can use any AI, anywhere. We're not measuring whether they can avoid AI; we're measuring how well they direct it. Identity, session integrity, and originality are still verified.",
  },
  {
    q: "SOC 2? GDPR? Data residency?",
    a: "SOC 2 Type II in progress. GDPR-compliant by default. Data residency options for EU and US. Sessions run in isolated cloud environments and are encrypted in transit and at rest.",
  },
  {
    q: "Which roles can I assess today?",
    a: "Software engineering, data, ML, applied AI, and AI-augmented product roles. New role templates ship weekly — and you can describe a role in plain language and we'll generate the assessment for it.",
  },
  {
    q: "What does this cost?",
    a: "Free to try. Per-assessment pricing once you're running real candidates, with volume tiers for teams hiring at scale. See the pricing section for details.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="relative section-canvas overflow-hidden">
      <div className="hairline" />

      <div
        className="glow-orb"
        style={{
          background: "hsl(var(--accent) / 0.18)",
          width: 520,
          height: 520,
          top: -160,
          left: "-10%",
        }}
      />

      <div className="mx-auto w-full max-w-3xl px-6 md:px-10 py-20 md:py-24 relative">
        <div className="flex items-end justify-between gap-6 mb-10 md:mb-12">
          <div>
            <p className="eyebrow mb-3">— Frequently asked</p>
            <h2 className="display text-3xl md:text-4xl">
              The <span className="display-italic">uncomfortable ones.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base max-w-xl">
              The questions hiring leaders actually ask in the second meeting.
            </p>
          </div>
          <p className="hidden md:block font-mono text-[10px] tracking-[0.18em] text-muted-foreground pb-2">
            {String(faqs.length).padStart(2, "0")} ITEMS
          </p>
        </div>

        <ul className="border-t border-foreground/10">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <li key={i} className="border-b border-foreground/10">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full grid grid-cols-[auto_1fr_auto] items-start gap-4 md:gap-6 py-4 md:py-5 text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`font-mono text-[10px] tracking-[0.2em] pt-1.5 transition-colors ${
                      isOpen ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3
                      className={`font-serif text-base md:text-lg leading-snug tracking-tight transition-colors ${
                        isOpen
                          ? "text-accent-deep"
                          : "text-foreground group-hover:text-accent-deep"
                      }`}
                    >
                      {f.q}
                    </h3>

                    <div
                      className={`grid transition-all duration-400 ease-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100 mt-2.5"
                          : "grid-rows-[0fr] opacity-0 mt-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-muted-foreground text-[14px] leading-relaxed max-w-2xl pb-1">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "bg-accent text-accent-foreground border-accent rotate-45"
                        : "border-foreground/15 text-foreground group-hover:border-accent group-hover:text-accent"
                    }`}
                    aria-hidden
                  >
                    <Plus className="h-3 w-3" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Still curious?
          </p>
          <a
            href="#top"
            className="font-serif italic text-sm text-accent-deep hover:text-accent transition-colors"
          >
            Talk to us directly →
          </a>
        </div>
      </div>
    </section>
  )
}
