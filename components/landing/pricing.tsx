import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"
import { LandingPageSection } from "@/components/landing/landing-page-width"

const tiers = [
  {
    tierLabel: "Tier 1",
    name: "Basic",
    price: "$149",
    cadence: "/mo",
    quota: "5 assessments / mo",
    blurb: "For teams starting to hire with AI.",
    eyebrow: null as string | null,
    features: [
      "AI-generated assessment from a job URL or description",
      "Task customisation (bug types, difficulty, time limit)",
      "1 assessment variant",
      "In-browser IDE (editor + terminal + live preview)",
      "AI chat assistant inside the IDE — OpenAI, Claude, Gemini, Groq",
      "Session replay (webcam + screen)",
      "Code attribution analysis (AI-written vs human-written)",
      "Overall PromptIQ score + behavior analysis",
      "Post-session integrity violation detection",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    tierLabel: "Tier 2",
    name: "Premium",
    price: "$449",
    cadence: "/mo",
    quota: "15 assessments / mo",
    blurb: "For teams hiring at scale.",
    eyebrow: "Most Popular",
    extraHeading: "Everything in Basic, plus:",
    features: [
      "Up to 20 assessment variants per role",
      "Live session monitoring dashboard (watch candidates in real-time)",
      "Real-time integrity violation detection (not post-session)",
      "Gemini video frame analysis",
      "Full 7-dimension scoring breakdown",
      "Bug discovery analysis (found / fixed / missed)",
      "Fluency & testing behaviour analysis",
      "Per-bug narrative (how it was found, how it was fixed)",
      "Priority support",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    tierLabel: "Tier 3",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    quota: "Unlimited assessments",
    blurb: "For orgs with high-volume or custom needs.",
    eyebrow: null,
    extraHeading: "Everything in Premium, plus:",
    features: [
      "Unlimited assessment variants",
      "Custom assessment templates built for your stack",
      "Google Docs / Sheets / Figma integration inside the candidate environment",
      "SSO & granular team/role management",
      "Dedicated account manager",
      "Custom integrations & SLAs",
    ],
    cta: "Book a Call",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative section-ink">
      <div className="hairline" />
      <LandingPageSection className="py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Pricing</p>
          <h2 className="display text-4xl md:text-5xl">
            Simple plans that <span className="display-italic">scale with your hiring.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
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
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t.tierLabel} — {t.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {t.eyebrow && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                      {t.eyebrow}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-1 flex-wrap">
                <span className="font-serif text-5xl font-medium tracking-tight text-foreground">
                  {t.price}
                </span>
                {t.cadence ? (
                  <span className="text-muted-foreground text-sm">{t.cadence}</span>
                ) : null}
              </div>

              <p className="mt-3 text-accent font-mono text-[11px] uppercase tracking-[0.16em]">
                {t.quota}
              </p>

              <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">{t.blurb}</p>

              <div className="my-6 hairline" />

              {"extraHeading" in t && t.extraHeading ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  {t.extraHeading}
                </p>
              ) : null}
              <ul className="space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[14px] md:text-[15px] text-foreground leading-snug">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
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
      </LandingPageSection>
    </section>
  )
}
