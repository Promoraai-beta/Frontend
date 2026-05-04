import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"

const tiers = [
  {
    name: "Basic",
    price: "$149",
    cadence: "/mo",
    quota: "5 assessments / mo",
    blurb: "For teams starting to hire with AI.",
    eyebrow: null as string | null,
    features: [
      "Standard interviews",
      "AI-generated debrief questions",
      "Session replay",
      "Code attribution analysis",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Premium",
    price: "$449",
    cadence: "/mo",
    quota: "15 assessments / mo",
    blurb: "For teams hiring at scale.",
    eyebrow: "Most Popular",
    features: ["Max interviews — 12 review agents, 12 debrief questions", "Priority support"],
    extraHeading: "Everything in Basic, plus:",
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    quota: "Unlimited assessments",
    blurb: "For orgs with high-volume or custom needs.",
    eyebrow: null,
    features: [
      "Custom assessment templates",
      "SSO & team management",
      "Dedicated account manager",
      "Custom integrations & SLAs",
    ],
    extraHeading: "Everything in Premium, plus:",
    cta: "Book a Call",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative section-ink">
      <div className="hairline" />
      <div className="container-prose py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Pricing</p>
          <h2 className="display text-4xl md:text-5xl">
            Simple plans that <span className="display-italic">scale with your hiring.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl p-7 flex flex-col bg-background border transition-shadow ${
                t.highlight
                  ? "border-accent shadow-[0_30px_80px_-40px_hsl(var(--accent)/0.55)]"
                  : "shadow-[0_10px_40px_-30px_hsl(var(--accent)/0.25)]"
              }`}
              style={{
                borderColor: t.highlight ? "hsl(var(--accent))" : "hsl(var(--hairline))",
              }}
            >
              {t.highlight && (
                <div
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                  style={{ background: "hsl(var(--accent))" }}
                />
              )}
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t.name}
                </p>
                {t.eyebrow && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                    {t.eyebrow}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-serif text-5xl font-medium tracking-tight text-foreground">
                  {t.price}
                </span>
                {t.cadence && (
                  <span className="text-muted-foreground text-sm">{t.cadence}</span>
                )}
              </div>

              <p className="mt-3 text-accent font-mono text-[11px] uppercase tracking-[0.16em]">
                {t.quota}
              </p>

              <p className="mt-4 text-muted-foreground">{t.blurb}</p>

              <div className="my-6 hairline" />

              {t.extraHeading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  {t.extraHeading}
                </p>
              )}
              <ul className="space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[15px] text-foreground">
                    <Check className="h-4 w-4 mt-1 shrink-0 text-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant={t.highlight ? "default" : "outline"}
                className={`mt-8 font-mono text-[11px] uppercase tracking-[0.18em] rounded-full h-11 ${
                  t.highlight
                    ? "bg-accent text-accent-foreground hover:bg-accent-glow"
                    : "border-foreground/20 text-foreground hover:bg-foreground/5"
                }`}
              >
                {t.cta}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-xl border bg-background p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          <div>
            <p className="text-foreground">
              Need more assessments?{" "}
              <span className="font-medium">$39 per additional assessment.</span>
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Includes AI evaluation budget per assessment.
            </p>
          </div>
          <Button
            variant="outline"
            className="font-mono text-[11px] uppercase tracking-[0.18em] rounded-full border-foreground/20 text-foreground hover:bg-foreground/5"
          >
            Book a Call
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
