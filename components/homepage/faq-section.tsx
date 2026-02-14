"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "What is PromoraAI?",
    answer:
      "PromoraAI measures how well candidates use AI tools — across coding, writing, and analysis — not just their final output.",
  },
  {
    question: "Who is PromoraAI for?",
    answer:
      "We’re built for engineering teams, recruiters, and founders who want to understand real AI skills, and for developers who want to showcase their AI-assisted workflow.",
  },
  {
    question: "How is this different from traditional coding tests?",
    answer:
      "Traditional tests often ban AI and only score the final answer. We show the full process — how candidates think, iterate, and work with AI.",
  },
  {
    question: "Can candidates use any AI tools?",
    answer:
      "Yes. Candidates can use their preferred tools (ChatGPT, Copilot, Claude, etc.). We focus on how they use AI, not whether they used it.",
  },
  {
    question: "Do you store candidate code and prompts securely?",
    answer:
      "Yes. All session data is stored securely and used only for assessment and analytics for the teams and candidates involved.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <section id="faq" className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl">FAQs</h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            Quick answers to the most common questions about PromoraAI.
          </p>
        </motion.div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  isOpen ? "border-emerald-500/30 bg-zinc-950/95" : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-white md:text-base">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-800/80 px-6 pb-5 pt-2">
                    <p className="text-sm leading-relaxed text-zinc-400">{faq.answer}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

