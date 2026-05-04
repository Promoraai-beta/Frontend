import { BrandLogo } from "@/components/landing/brand-logo"
import { LandingPageSection } from "@/components/landing/landing-page-width"
import { Check, X, Minus } from "lucide-react"

type Cell = { text: string; mark?: "check" | "x" | "dash" }

const rows: { label: string; values: [Cell, Cell, Cell, Cell, Cell, Cell] }[] = [
  {
    label: "Portable AI-fluency score",
    values: [
      { text: "None" },
      { text: "None" },
      { text: "None" },
      { text: "None" },
      { text: "None" },
      { text: "Yes — shareable", mark: "check" },
    ],
  },
  {
    label: "Who designs the assessment",
    values: [
      { text: "You" },
      { text: "You" },
      { text: "You" },
      { text: "Author-your-own" },
      { text: "You" },
      { text: "AI Agent — you just approve", mark: "check" },
    ],
  },
  {
    label: "AI tools for candidates",
    values: [
      { text: "Built-in only" },
      { text: "Built-in only" },
      { text: "Live interviewer-controlled" },
      { text: "CoderPad AI assistant" },
      { text: "Claude Code only" },
      { text: "Any — ChatGPT, Copilot, Claude, anything", mark: "check" },
    ],
  },
  {
    label: "Setup required",
    values: [
      { text: "High" },
      { text: "High" },
      { text: "Schedule + interviewer" },
      { text: "Author each pad" },
      { text: "Connect a repo, build a rubric" },
      { text: "Describe the role. That's it.", mark: "check" },
    ],
  },
  {
    label: "What you evaluate",
    values: [
      { text: "Code correctness" },
      { text: "Code correctness" },
      { text: "Live problem solving" },
      { text: "Live problem solving" },
      { text: "How engineers build" },
      { text: "How candidates work with AI", mark: "check" },
    ],
  },
  {
    label: "Who it's built for",
    values: [
      { text: "Engineering teams" },
      { text: "Engineering teams" },
      { text: "Engineering teams" },
      { text: "Engineering teams" },
      { text: "Engineering teams" },
      { text: "Anyone hiring for tech roles", mark: "check" },
    ],
  },
  {
    label: "Interviewer time required",
    values: [
      { text: "High" },
      { text: "Medium" },
      { text: "High" },
      { text: "High" },
      { text: "Zero" },
      { text: "Zero", mark: "check" },
    ],
  },
]

const cols: Array<"HackerRank" | "CodeSignal" | "Rounds" | "CoderPad" | "Saffron" | "Promora"> = [
  "HackerRank",
  "CodeSignal",
  "Rounds",
  "CoderPad",
  "Saffron",
  "Promora",
]

function Mark({ mark, isUs }: { mark?: Cell["mark"]; isUs?: boolean }) {
  if (mark === "check")
    return <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isUs ? "text-accent" : "text-accent"}`} />
  if (mark === "x") return <X className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
  if (mark === "dash") return <Minus className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
  return <span className="h-4 w-4 mt-0.5 shrink-0" />
}

export function Compare() {
  return (
    <section id="compare" className="relative section-canvas">
      <div className="hairline" />
      <LandingPageSection className="py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Compare</p>
          <h2 className="display text-4xl md:text-5xl">
            The only platform that measures <span className="display-italic">how</span> candidates work
            with AI. Not just what they produce.
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            Other platforms added AI to their assessments. Promora was built around it — any tool, any
            candidate, zero setup.
          </p>
        </div>

        <div className="mt-16 hidden md:block">
          <div
            className="overflow-hidden rounded-2xl border bg-background relative"
            style={{ borderColor: "hsl(var(--hairline))" }}
          >
            <table className="w-full text-left border-collapse">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="p-5"></th>
                  {cols.map((c, i) => {
                    const isUs = i === cols.length - 1
                    return (
                      <th
                        key={c}
                        className={`p-5 align-top ${isUs ? "bg-accent-soft border-x" : ""}`}
                        style={isUs ? { borderColor: "hsl(var(--accent) / 0.4)" } : undefined}
                      >
                        <BrandLogo name={c} tone="default" />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr
                    key={r.label}
                    className="border-t"
                    style={{ borderColor: "hsl(var(--hairline))" }}
                  >
                    <td className="p-5 text-muted-foreground text-sm align-top">{r.label}</td>
                    {r.values.map((v, i) => {
                      const isUs = i === r.values.length - 1
                      const isLast = ri === rows.length - 1
                      return (
                        <td
                          key={i}
                          className={`p-5 align-top text-sm leading-relaxed ${
                            isUs
                              ? `bg-accent-soft border-x text-foreground ${isLast ? "rounded-b-xl" : ""}`
                              : "text-foreground/85"
                          }`}
                          style={isUs ? { borderColor: "hsl(var(--accent) / 0.4)" } : undefined}
                        >
                          <div className="flex gap-2">
                            <Mark mark={v.mark} isUs={isUs} />
                            <span>{v.text}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:hidden">
          {cols.map((c, ci) => {
            const isUs = ci === cols.length - 1
            return (
              <div
                key={c}
                className={`rounded-xl border p-6 ${
                  isUs ? "bg-accent-soft border-accent" : "bg-background"
                }`}
                style={!isUs ? { borderColor: "hsl(var(--hairline))" } : undefined}
              >
                <div className="mb-4">
                  <BrandLogo name={c} tone="default" />
                </div>
                <dl className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.label}>
                      <dt className="text-xs text-muted-foreground">{r.label}</dt>
                      <dd className="font-serif flex gap-2">
                        <Mark mark={r.values[ci].mark} isUs={isUs} />
                        <span>{r.values[ci].text}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
        </div>
      </LandingPageSection>
    </section>
  )
}
