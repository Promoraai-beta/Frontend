import { FileText, Sparkles, Eye } from "lucide-react"

const steps = [
  {
    n: "01",
    icon: FileText,
    duration: "~2 min",
    title: "Paste a JD",
    body: "We parse the role and generate a unique assessment. Nothing leaks, nothing repeats.",
  },
  {
    n: "02",
    icon: Sparkles,
    duration: "60–90 min",
    title: "Candidate works with AI",
    body: "They pick Claude, GPT, or Gemini. We watch every prompt, edit, and recovery — not the keystrokes, the reasoning.",
  },
  {
    n: "03",
    icon: Eye,
    duration: "Instant",
    title: "PromptIQ + verdict",
    body: "A 0–100 score, five-dimension breakdown, agent-panel recommendation. Send it to the hiring manager. They'll get it.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative section-ink py-24 md:py-32 overflow-hidden">
      <div
        className="glow-orb"
        style={{
          background: "hsl(var(--accent) / 0.35)",
          width: 520,
          height: 520,
          top: -140,
          right: -180,
        }}
      />
      <div className="hairline opacity-40" />

      <div className="container-prose relative pt-16">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">How It Works</p>
          <h2 className="display text-4xl md:text-5xl">
            From job description to <span className="display-italic">defensible verdict.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            Three steps. No question banks, no rubric writing, no transcript reviewing. The whole loop
            runs in under 90 minutes per candidate.
          </p>
        </div>

        <div className="relative mt-20 md:mt-28 hidden md:block">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 h-px"
            style={{
              background:
                "linear-gradient(to right, hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.5), hsl(var(--accent) / 0.05))",
            }}
          />

          <ol className="grid grid-cols-3 gap-10">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li key={step.n} className="relative pt-16">
                  <span
                    aria-hidden
                    className="absolute left-0 top-6 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-background"
                    style={{
                      boxShadow:
                        "0 0 0 5px hsl(var(--accent) / 0.18), 0 0 24px hsl(var(--accent) / 0.6)",
                    }}
                  />

                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] tracking-[0.22em] text-accent">
                        STEP {step.n}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                        {step.duration}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-serif text-xl lg:text-2xl text-foreground leading-[1.2] tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground text-sm lg:text-base leading-relaxed">
                    {step.body}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="relative mt-16 md:hidden">
          <div
            aria-hidden
            className="absolute left-5 top-2 bottom-2 w-px"
            style={{
              background:
                "linear-gradient(to bottom, hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.5), hsl(var(--accent) / 0.05))",
            }}
          />
          <ol className="space-y-12">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li key={step.n} className="relative pl-14">
                  <span
                    aria-hidden
                    className="absolute left-5 top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-accent ring-4 ring-background"
                    style={{
                      boxShadow:
                        "0 0 0 5px hsl(var(--accent) / 0.18), 0 0 24px hsl(var(--accent) / 0.6)",
                    }}
                  />
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] tracking-[0.22em] text-accent">
                        STEP {step.n}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                        {step.duration}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl text-foreground leading-[1.15] tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{step.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
