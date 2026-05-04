import { LandingPageSection } from "@/components/landing/landing-page-width"

const stats = [
  { n: "7x", label: "Demand growth", body: "Jobs requiring AI fluency, 2024 to 2026." },
  { n: "48%", label: "Assessment volume", body: "Rise in technical assessments globally." },
  { n: "42%", label: "AI in hiring", body: "Of hiring teams now use AI inside assessments." },
]

export function Stats() {
  return (
    <section className="relative section-canvas">
      <div className="hairline" />
      <LandingPageSection className="py-20 md:py-28">
        <div
          className="grid md:grid-cols-3 gap-px border-t border-b"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          {stats.map((s, i) => (
            <div
              key={s.n}
              className={`py-10 md:py-14 md:px-8 text-center flex flex-col items-center ${
                i > 0 ? "md:border-l" : ""
              }`}
              style={{ borderColor: "hsl(var(--hairline))" }}
            >
              <p className="display text-5xl md:text-6xl text-foreground">
                <span className="display-italic">{s.n}</span>
              </p>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                {s.label}
              </p>
              <p className="mt-2 text-muted-foreground text-sm md:text-base leading-relaxed max-w-xs">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </LandingPageSection>
    </section>
  )
}
