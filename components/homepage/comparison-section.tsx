"use client"

import { motion } from "framer-motion"

const PromoraLogo = () => (
  <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor">
    <polygon points="50,50 15,18 26,10"/>
    <polygon points="50,50 58,5 67,12"/>
    <polygon points="50,50 73,17 80,26"/>
    <polygon points="50,50 86,38 87,50"/>
    <polygon points="50,50 79,67 69,77"/>
    <polygon points="50,50 46,88 36,84"/>
    <polygon points="50,50 8,62 18,80"/>
  </svg>
)

// HackerRank — real SVG from simple-icons (brand color #00EA64)
const HackerRankLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="#00EA64">
    <path d="M0 0v24h24V0zm9.95 8.002h1.805c.061 0 .111.05.111.111v7.767c0 .061-.05.111-.11.111H9.95c-.061 0-.111-.05-.111-.11v-2.87H7.894v2.87c0 .06-.05.11-.11.11H5.976a.11.11 0 01-.11-.11V8.112c0-.06.05-.11.11-.11h1.806c.061 0 .11.05.11.11v2.869H9.84v-2.87c0-.06.05-.11.11-.11zm2.999 0h5.778c.061 0 .111.05.111.11v7.767a.11.11 0 01-.11.112h-5.78a.11.11 0 01-.11-.11V8.111c0-.06.05-.11.11-.11z"/>
  </svg>
)

// CodeSignal — real SVG from simple-icons (brand color #1062FB)
const CodeSignalLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="#1062FB">
    <path d="M24 1.212 13.012 2.787 12 5.62l-1.01-2.833L0 1.212 3.672 11.45l4.512.646 3.815 10.691 3.816-10.691 4.512-.646zm-3.625 4.406-4.52.648-.73 2.044 4.517-.647-.734 2.047-4.514.647L12 17.064l-2.393-6.707-4.514-.647-.735-2.047 4.518.647-.73-2.044-4.52-.648-.735-2.047 6.676.956L12 11.345l2.434-6.818 6.676-.956Z"/>
  </svg>
)

// CoderPad — logo fetched from clearbit (loads in browser)
const CoderPadLogo = () => (
  <img
    src="https://logo.clearbit.com/coderpad.io"
    alt="CoderPad"
    className="h-6 w-6 object-contain"
    onError={(e) => {
      e.currentTarget.src = "https://www.google.com/s2/favicons?domain=coderpad.io&sz=128"
    }}
  />
)

// Saffron — logo fetched from clearbit (loads in browser)
const SaffronLogo = () => (
  <img
    src="https://logo.clearbit.com/trysaffron.ai"
    alt="Saffron"
    className="h-6 w-6 object-contain"
    onError={(e) => {
      e.currentTarget.src = "https://www.google.com/s2/favicons?domain=trysaffron.ai&sz=128"
    }}
  />
)

const vendors = [
  {
    name: "PromoraAI",
    sub: "Process-aware",
    logo: <PromoraLogo />,
    logoContainerClass: "bg-violet-600",
    highlight: true,
  },
  {
    name: "HackerRank",
    sub: "AI-assisted IDE",
    logo: <HackerRankLogo />,
    logoContainerClass: "bg-[#1a1a1a]",
  },
  {
    name: "CodeSignal",
    sub: "Cosmo copilot",
    logo: <CodeSignalLogo />,
    logoContainerClass: "bg-white border border-border",
  },
  {
    name: "CoderPad",
    sub: "Live pad + AI",
    logo: <CoderPadLogo />,
    logoContainerClass: "bg-white border border-border",
  },
  {
    name: "Saffron",
    sub: "Repo + Claude",
    logo: <SaffronLogo />,
    logoContainerClass: "bg-white border border-border",
  },
]

type Status = "green" | "yellow" | "gray"

const Dot = ({ status, inverted }: { status: Status; inverted?: boolean }) => (
  <span className={`mr-2 inline-block h-2 w-2 rounded-full flex-shrink-0 ${
    status === "green"
      ? inverted ? "bg-emerald-500" : "bg-emerald-400"
      : status === "yellow"
      ? inverted ? "bg-amber-500" : "bg-amber-400"
      : inverted ? "bg-background/20" : "bg-muted-foreground/30"
  }`} />
)

const Cell = ({ status, text, inverted }: { status: Status; text: string; inverted?: boolean }) => (
  <div className={`flex items-start gap-2 py-4 px-4 text-sm ${inverted ? "text-background/70" : "text-muted-foreground"}`}>
    <Dot status={status} inverted={inverted} />
    <span>{text}</span>
  </div>
)

const rows = [
  {
    capability: "Portable AI-fluency score",
    description: "One number a candidate can carry across roles & companies.",
    cells: [
      { status: "green" as Status, text: "Yes — shareable" },
      { status: "gray" as Status, text: "None" },
      { status: "gray" as Status, text: "None" },
      { status: "gray" as Status, text: "None" },
      { status: "gray" as Status, text: "None" },
    ],
  },
  {
    capability: "JD-unique tasks per role",
    description: "Generated from the job description — no shared question bank to leak.",
    cells: [
      { status: "green" as Status, text: "Default" },
      { status: "yellow" as Status, text: "JD generator picks from bank" },
      { status: "yellow" as Status, text: "Cosmo selects from 1k+ certified" },
      { status: "gray" as Status, text: "Author-your-own" },
      { status: "yellow" as Status, text: "Repo-derived" },
    ],
  },
  {
    capability: "Multi-LLM in the IDE",
    description: "Candidate picks the model — Claude, GPT, Gemini.",
    cells: [
      { status: "green" as Status, text: "Claude · GPT · Gemini" },
      { status: "yellow" as Status, text: "HackerRank-supplied assistant" },
      { status: "yellow" as Status, text: "Cosmo (GPT-4o based)" },
      { status: "yellow" as Status, text: "CoderPad AI assistant" },
      { status: "gray" as Status, text: "Claude only" },
    ],
  },
  {
    capability: "Process replay + transcript",
    description: "See how they got there — every prompt, edit, paste.",
    cells: [
      { status: "green" as Status, text: "Full session replay" },
      { status: "green" as Status, text: "Full transcripts + Proctor replay" },
      { status: "green" as Status, text: "Cosmo transcript + replay" },
      { status: "yellow" as Status, text: "Playback (live pad)" },
      { status: "yellow" as Status, text: "Git history" },
    ],
  },
  {
    capability: "Agent panel verdict",
    description: "Hire / Hold / Pass with cited reasoning — not just a number.",
    cells: [
      { status: "green" as Status, text: "Yes — auditable" },
      { status: "yellow" as Status, text: "Auto-scored summary" },
      { status: "yellow" as Status, text: "Auto-scored summary" },
      { status: "gray" as Status, text: "Manual" },
      { status: "yellow" as Status, text: "Single-agent rubric" },
    ],
  },
  {
    capability: "Setup time (JD → live link)",
    description: "From \"we want to try this\" to a candidate-facing link.",
    cells: [
      { status: "green" as Status, text: "~ 4 minutes" },
      { status: "yellow" as Status, text: "JD generator + review" },
      { status: "yellow" as Status, text: "Cosmo-assisted" },
      { status: "gray" as Status, text: "Author each pad" },
      { status: "gray" as Status, text: "Repo prep required" },
    ],
  },
]

export function ComparisonSection() {
  return (
    <section id="compare" className="relative py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8 max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
            <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">SIDE-BY-SIDE</span>
          </div>

          <h2 className="mb-4 font-serif text-4xl font-bold leading-[1.1] text-foreground md:text-5xl">
            Everyone has <em className="not-italic">"AI mode."</em><br />
            Here's what actually shipped.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Nine dimensions. Five vendors. Sourced from public product pages and 2025 release notes.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-2xl border border-border"
        >
          {/* Vendor header row */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "280px repeat(5, 1fr)" }}>
            <div className="px-4 py-4">
              <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">CAPABILITY</span>
            </div>
            {vendors.map((v) => (
              <div
                key={v.name}
                className={`flex items-center gap-2.5 px-4 py-4 ${
                  v.highlight
                    ? "bg-foreground border-x border-foreground"
                    : ""
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  v.highlight ? "bg-background" : v.logoContainerClass
                }`}>
                  {v.logo}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${v.highlight ? "text-background" : "text-foreground"}`}>
                    {v.name}
                  </p>
                  <p className={`truncate text-xs ${v.highlight ? "text-background/50" : "text-muted-foreground"}`}>
                    {v.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map((row, i) => (
            <div
              key={row.capability}
              className={`grid border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
              style={{ gridTemplateColumns: "280px repeat(5, 1fr)" }}
            >
              {/* Capability */}
              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-foreground">{row.capability}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.description}</p>
              </div>
              {/* Vendor cells */}
              {row.cells.map((cell, j) => (
                <div
                  key={j}
                  className={vendors[j].highlight ? "bg-foreground border-x border-foreground" : ""}
                >
                  <Cell
                    status={cell.status}
                    text={cell.text}
                    inverted={vendors[j].highlight}
                  />
                </div>
              ))}
            </div>
          ))}
        </motion.div>
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="my-6 overflow-hidden rounded-2xl border border-border bg-card/60"
        >
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { stat: "7×", label: "DEMAND GROWTH", desc: "Jobs requiring AI fluency, 2024 → 2026." },
              { stat: "48%", label: "ASSESSMENT VOLUME", desc: "Rise in technical assessments globally." },
              { stat: "42%", label: "AI IN HIRING", desc: "Of hiring teams now use AI inside assessments." },
            ].map((s) => (
              <div key={s.stat} className="px-10 py-10">
                <p className="mb-3 font-serif text-6xl font-bold text-foreground">{s.stat}</p>
                <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground">{s.label}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
