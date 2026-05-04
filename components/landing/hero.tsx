import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Sparkles, CheckCircle2 } from "lucide-react"
import { NoiseRipple } from "@/components/landing/noise-ripple"

const scoreBars = [
  { label: "Scaffolding quality", value: 82 },
  { label: "Debugging skill", value: 74 },
  { label: "Hallucination recovery", value: 91 },
  { label: "Optimisation thinking", value: 65 },
  { label: "Testing approach", value: 70 },
]

const stats = ["JD-UNIQUE", "MULTI-LLM", "AGENT-WRITTEN VERDICT", "ZERO SETUP"]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden hero-noise-bg -mt-16 pt-16">
      <NoiseRipple />

      <div className="container-prose relative pt-20 pb-28 md:pt-28 md:pb-36 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-background/70 backdrop-blur px-3 py-1 mb-8 animate-fade-up shadow-sm">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/80">
            Hiring for the AI-native workplace
          </span>
        </div>

        <h1
          className="display text-[2.6rem] sm:text-6xl md:text-7xl max-w-5xl mx-auto animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          Anyone can vibe code.
          <br />
          But can they actually{" "}
          <span className="display-italic">engineer your product?</span>
        </h1>

        <p
          className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          See exactly how every candidate works with AI — before you make a call.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <Button
            size="lg"
            className="font-mono text-xs uppercase tracking-[0.16em] bg-accent text-accent-foreground hover:bg-accent-deep rounded-full px-6 h-12 shadow-[0_10px_30px_-10px_hsl(var(--accent)/0.6)] transition-all"
          >
            Book Demo
            <ArrowRight className="ml-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="font-mono text-xs uppercase tracking-[0.16em] rounded-full px-6 h-12 bg-background/60 backdrop-blur border-foreground/20 hover:bg-background"
            asChild
          >
            <a href="#how-it-works">
              <Play className="mr-1" />
              See How It Works
            </a>
          </Button>
        </div>

        <div
          className="mt-10 flex items-center justify-center gap-x-6 gap-y-3 flex-wrap animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          {stats.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-foreground/30" />}
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {s}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-16 mx-auto max-w-4xl rounded-2xl border bg-background/90 backdrop-blur shadow-[0_30px_80px_-40px_hsl(var(--accent)/0.4)] overflow-hidden animate-fade-up text-left"
          style={{ animationDelay: "360ms", borderColor: "hsl(var(--hairline))" }}
        >
          <div
            className="flex items-center gap-1.5 px-4 py-3 border-b"
            style={{ borderColor: "hsl(var(--hairline))" }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              sample-report.promora
            </span>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                  Candidate
                </p>
                <h3 className="font-serif text-2xl md:text-3xl text-foreground tracking-tight">
                  M. Reyes
                </h3>
                <p className="mt-1 font-mono text-[11px] tracking-[0.16em] text-muted-foreground">
                  58 MIN · 47 PROMPTS · 3 LLMs
                </p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                  HIRE — LOW RISK
                </span>
              </div>
            </div>

            <div className="mt-8 grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  PromptIQ Score
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-6xl md:text-7xl font-medium tracking-tight text-foreground">
                    78
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">/ 100</span>
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                  Strong
                </p>
              </div>

              <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
                {scoreBars.map((b) => (
                  <div
                    key={b.label}
                    className="relative rounded-xl p-4 backdrop-blur-xl border overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(var(--accent) / 0.10), hsl(var(--accent) / 0.02))",
                      borderColor: "hsl(var(--accent) / 0.20)",
                      boxShadow:
                        "inset 0 1px 0 hsl(var(--accent) / 0.15), 0 8px 24px -16px hsl(var(--accent) / 0.4)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute -top-8 -right-8 h-16 w-16 rounded-full blur-2xl"
                      style={{ background: "hsl(var(--accent) / 0.35)" }}
                    />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-tight min-h-[22px]">
                      {b.label}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-serif text-3xl text-foreground tracking-tight">
                        {b.value}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-8 rounded-xl border bg-accent-soft/60 p-5"
              style={{ borderColor: "hsl(var(--accent) / 0.25)" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Agent verdict
              </p>
              <p className="font-serif text-base md:text-lg text-foreground leading-relaxed">
                &quot;Caught 2 hallucinated API calls and self-corrected without prompting. Iterative,
                specific prompts — not vague asks. Strong instinct for where AI breaks down.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
