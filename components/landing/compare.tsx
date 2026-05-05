import { BrandLogo } from "@/components/landing/brand-logo"
import { LandingPageSection } from "@/components/landing/landing-page-width"
import { Check, Minus, X } from "lucide-react"

type Tone = "positive" | "neutral" | "negative"
type Cell = { text: string; tone?: Tone }

const competitors = ["HackerRank", "CodeSignal", "Rounds", "CoderPad", "Saffron"] as const

const rows: { label: string; sub?: string; ours: Cell; theirs: Cell[] }[] = [
  {
    label: "Portable AI-fluency score",
    sub: "Reusable signal across hires",
    ours: { text: "Yes — shareable", tone: "positive" },
    theirs: [
      { text: "None", tone: "negative" },
      { text: "None", tone: "negative" },
      { text: "None", tone: "negative" },
      { text: "None", tone: "negative" },
      { text: "None", tone: "negative" },
    ],
  },
  {
    label: "Who designs the assessment",
    ours: { text: "AI Agent — you approve", tone: "positive" },
    theirs: [
      { text: "You", tone: "neutral" },
      { text: "You", tone: "neutral" },
      { text: "You", tone: "neutral" },
      { text: "Author-your-own", tone: "neutral" },
      { text: "You", tone: "neutral" },
    ],
  },
  {
    label: "AI tools for candidates",
    ours: { text: "Any tool — ChatGPT, Claude, Copilot", tone: "positive" },
    theirs: [
      { text: "Built-in only", tone: "negative" },
      { text: "Built-in only", tone: "negative" },
      { text: "Interviewer-controlled", tone: "neutral" },
      { text: "CoderPad AI assistant", tone: "neutral" },
      { text: "Claude Code only", tone: "neutral" },
    ],
  },
  {
    label: "Setup required",
    ours: { text: "Describe the role", tone: "positive" },
    theirs: [
      { text: "High", tone: "negative" },
      { text: "High", tone: "negative" },
      { text: "Schedule + interviewer", tone: "negative" },
      { text: "Author each pad", tone: "neutral" },
      { text: "Repo + rubric", tone: "neutral" },
    ],
  },
  {
    label: "What you evaluate",
    ours: { text: "How candidates work with AI", tone: "positive" },
    theirs: [
      { text: "Code correctness", tone: "neutral" },
      { text: "Code correctness", tone: "neutral" },
      { text: "Live problem solving", tone: "neutral" },
      { text: "Live problem solving", tone: "neutral" },
      { text: "How engineers build", tone: "neutral" },
    ],
  },
  {
    label: "Who it's built for",
    ours: { text: "Anyone hiring tech roles", tone: "positive" },
    theirs: [
      { text: "Engineering teams", tone: "neutral" },
      { text: "Engineering teams", tone: "neutral" },
      { text: "Engineering teams", tone: "neutral" },
      { text: "Engineering teams", tone: "neutral" },
      { text: "Engineering teams", tone: "neutral" },
    ],
  },
  {
    label: "Interviewer time required",
    ours: { text: "Zero", tone: "positive" },
    theirs: [
      { text: "High", tone: "negative" },
      { text: "Medium", tone: "negative" },
      { text: "High", tone: "negative" },
      { text: "High", tone: "negative" },
      { text: "Zero", tone: "positive" },
    ],
  },
]

function ToneIcon({ tone }: { tone?: Tone }) {
  if (tone === "positive")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    )
  if (tone === "negative")
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
        <X className="h-3 w-3" strokeWidth={2.5} />
      </span>
    )
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
      <Minus className="h-3 w-3" strokeWidth={2.5} />
    </span>
  )
}

export function Compare() {
  return (
    <section id="compare" className="relative section-canvas">
      <div className="hairline" />
      <LandingPageSection className="py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Compare</p>
          <h2 className="display text-4xl md:text-5xl">
            The only platform that measures <span className="display-italic">how</span> candidates work with AI. Not
            just what they produce.
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            Other platforms added AI to their assessments. Promora was built around it — any tool, any candidate, zero
            setup.
          </p>
        </div>

        <div className="mt-16 hidden md:block">
          <div
            className="overflow-hidden rounded-3xl border bg-background"
            style={{
              borderColor: "hsl(var(--hairline))",
              boxShadow: "0 30px 80px -50px hsl(var(--accent) / 0.25)",
            }}
          >
            <table className="w-full border-collapse text-left">
              <colgroup>
                <col style={{ width: "26%" }} />
                <col style={{ width: "22%" }} />
                {competitors.map((c) => (
                  <col key={c} style={{ width: `${52 / competitors.length}%` }} />
                ))}
              </colgroup>

              <thead>
                <tr>
                  <th className="px-6 pb-5 pt-7 align-bottom">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Dimension</p>
                  </th>
                  <th
                    className="relative px-5 pb-5 pt-5 align-bottom"
                    style={{
                      background: "hsl(var(--accent-soft))",
                      borderLeft: "1px solid hsl(var(--accent) / 0.35)",
                      borderRight: "1px solid hsl(var(--accent) / 0.35)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 right-0 top-0 h-[3px]"
                      style={{ background: "hsl(var(--accent))" }}
                    />
                    <BrandLogo name="Promora" />
                  </th>
                  {competitors.map((c) => (
                    <th key={c} className="px-4 pb-5 pt-7 align-bottom">
                      <div className="grayscale opacity-55">
                        <BrandLogo name={c} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((r, ri) => (
                  <tr key={r.label} className="group">
                    <td className="border-t px-6 py-6 align-top" style={{ borderColor: "hsl(var(--hairline))" }}>
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/50">
                          {String(ri + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-serif text-[15px] leading-snug text-foreground">{r.label}</h3>
                      </div>
                      {r.sub ? (
                        <p className="ml-[34px] mt-1.5 text-xs text-muted-foreground">{r.sub}</p>
                      ) : null}
                    </td>

                    <td
                      className="relative px-5 py-6 align-top"
                      style={{
                        background: "hsl(var(--accent-soft))",
                        borderLeft: "1px solid hsl(var(--accent) / 0.35)",
                        borderRight: "1px solid hsl(var(--accent) / 0.35)",
                        borderTop: "1px solid hsl(var(--accent) / 0.18)",
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <ToneIcon tone={r.ours.tone} />
                        <span className="text-[13.5px] font-medium leading-snug text-foreground">{r.ours.text}</span>
                      </div>
                    </td>

                    {r.theirs.map((v, i) => (
                      <td
                        key={i}
                        className="border-t px-4 py-6 align-top"
                        style={{ borderColor: "hsl(var(--hairline))" }}
                      >
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <ToneIcon tone={v.tone} />
                          <span className="text-[12.5px] leading-snug">{v.text}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}

                <tr aria-hidden>
                  <td />
                  <td
                    className="h-2"
                    style={{
                      background: "hsl(var(--accent-soft))",
                      borderLeft: "1px solid hsl(var(--accent) / 0.35)",
                      borderRight: "1px solid hsl(var(--accent) / 0.35)",
                      borderBottom: "3px solid hsl(var(--accent))",
                    }}
                  />
                  <td colSpan={competitors.length} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:hidden">
          {rows.map((r, ri) => (
            <div
              key={r.label}
              className="rounded-2xl border bg-background p-5"
              style={{ borderColor: "hsl(var(--hairline))" }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/50">
                  {String(ri + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-base text-foreground">{r.label}</h3>
              </div>

              <div
                className="relative mt-4 overflow-hidden rounded-xl border bg-accent-soft p-3"
                style={{ borderColor: "hsl(var(--accent) / 0.4)" }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 right-0 top-0 h-[2px]"
                  style={{ background: "hsl(var(--accent))" }}
                />
                <div className="mb-2">
                  <BrandLogo name="Promora" />
                </div>
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <ToneIcon tone={r.ours.tone} />
                  <span className="font-medium">{r.ours.text}</span>
                </div>
              </div>

              <ul className="mt-4 divide-y" style={{ borderColor: "hsl(var(--hairline))" }}>
                {competitors.map((c, i) => (
                  <li key={c} className="flex items-center justify-between gap-4 py-2.5 text-xs">
                    <span className="grayscale opacity-55">
                      <BrandLogo name={c} />
                    </span>
                    <span className="flex items-center gap-1.5 text-right text-muted-foreground">
                      <ToneIcon tone={r.theirs[i].tone} />
                      {r.theirs[i].text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LandingPageSection>
    </section>
  )
}
