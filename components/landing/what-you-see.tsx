import { LandingPageSection } from "@/components/landing/landing-page-width"

const cards = [
  {
    label: "The PromptIQ Score",
    body: "A single 0–100 score built from five dimensions of AI collaboration. One number your hiring manager will actually understand. No black box — every point is explained.",
  },
  {
    label: "Full Session Replay",
    body: "Every prompt sent, every edit made, every AI suggestion accepted or rejected. Watch exactly how they worked — not just what they shipped.",
  },
  {
    label: "Agent Verdict",
    body: "An AI panel reviews the full session against your job description and writes a plain-language hiring recommendation. Hire, pass, or borderline — with reasoning behind every call.",
  },
  {
    label: "Shareable Candidate Report",
    body: "A clean, formatted report you can forward to your hiring manager, your team, or keep on file. No login required to read it.",
  },
]

export function WhatYouSee() {
  return (
    <section className="relative section-ink">
      <div className="hairline" />
      <LandingPageSection className="py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">What You Get</p>
          <h2 className="display text-4xl md:text-5xl">
            Not a gut feeling. <span className="display-italic">A full picture.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Every assessment ends with a complete recruiter report. Here&apos;s what&apos;s inside.
          </p>
        </div>

        <div
          className="mt-16 grid md:grid-cols-2 gap-px bg-hairline border"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          {cards.map((c, i) => (
            <div key={i} className="bg-background p-8 md:p-10">
              <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                {c.label}
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </LandingPageSection>
    </section>
  )
}
