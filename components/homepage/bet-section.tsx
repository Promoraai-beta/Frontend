"use client"

import { motion } from "framer-motion"

const columns = [
  {
    title: "Bolt-on incumbents",
    tags: "HACKERRANK · CODESIGNAL · CODERPAD · CODILITY",
    items: [
      { pass: false, text: <>AI shipped as a paid <strong>add-on</strong>.</> },
      { pass: false, text: <>Transcripts and replays — <strong>you</strong> interpret.</> },
      { pass: false, text: "Static question banks. Leaked. Googleable." },
      { pass: false, text: "One LLM at most. Often vendor-locked." },
    ],
  },
  {
    title: "Repo-native challenger",
    tags: "SAFFRON",
    items: [
      { pass: false, text: <>Tied to <strong>your</strong> GitHub repo — high setup friction.</> },
      { pass: false, text: "Claude Code only. Vendor-locked." },
      { pass: false, text: "Rubric output, not a portable score." },
      { pass: false, text: "Single-company — nothing follows the candidate." },
    ],
  },
  {
    title: "Promora — the score",
    tags: "PROMPTIQ · PORTABLE",
    highlight: true,
    items: [
      { pass: true, text: <><strong>PromptIQ 0–100</strong> — one number, five dimensions, portable.</> },
      { pass: true, text: <><strong>JD-unique</strong> assessment, generated per role — nothing to Google.</> },
      { pass: true, text: <><strong>Claude + GPT + Gemini</strong> — we evaluate fluency, not loyalty to a vendor.</> },
      { pass: true, text: <><strong>Agent-panel verdict</strong>. The candidate keeps the score.</> },
    ],
  },
]

export function BetSection() {
  return (
    <section id="problem" className="relative py-12 md:py-16">
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
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">THE BET</span>
          </div>

          <h2 className="mb-6 font-serif text-4xl font-bold leading-[1.1] text-foreground md:text-5xl">
            Three bets in the market.<br />
            Only one ends with a <em className="not-italic">score</em>.
          </h2>

          <p className="text-base leading-relaxed text-muted-foreground">
            HackerRank and CoderPad bolted AI onto 10-year-old assessments. Saffron tied evaluation to your repo — high-friction, single-company. PromoraAI made the score itself the product: portable, JD-agnostic, hiring-manager-ready.
          </p>
        </motion.div>

        {/* Three columns */}
        <div className="grid gap-4 md:grid-cols-3 items-stretch">
          {columns.map((col, i) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative rounded-2xl border p-8 ${
                col.highlight
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card/40"
              }`}
            >
              <h3 className={`mb-2 font-serif text-2xl font-bold ${
                col.highlight ? "text-background" : "text-foreground"
              }`}>{col.title}</h3>
              <p className={`mb-6 text-xs font-semibold tracking-[0.12em] ${
                col.highlight ? "text-background/50" : "text-muted-foreground"
              }`}>{col.tags}</p>

              <ul className="space-y-4">
                {col.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 text-sm font-bold ${
                      item.pass
                        ? "text-background"
                        : "text-muted-foreground/40"
                    }`}>
                      {item.pass ? "✓" : "✗"}
                    </span>
                    <span className={`text-sm leading-relaxed ${
                      item.pass ? "text-background/80" : "text-muted-foreground"
                    }`}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
