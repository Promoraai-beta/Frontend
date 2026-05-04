const blocks = [
  {
    lead: "The incumbents bolted AI on.",
    body: "Same 10-year-old assessments. AI copilot added on top. Pass/fail score. Nothing changed.",
  },
  {
    lead: "The challenger tied it to your repo.",
    body: "Built around AI. But locked to one codebase, one tool, one company.",
  },
  {
    lead: "No standard exists to measure it.",
    body: "There's no benchmark, no certification, no rubric. Every company is guessing. The best AI collaborators and the worst ones look identical until someone actually watches them work.",
  },
]

export function Problem() {
  return (
    <section id="problem" className="relative section-ink">
      <div className="hairline" />
      <div className="container-prose py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">The Problem</p>
          <h2 className="display text-4xl md:text-5xl">
            Hiring for AI fluency is a problem{" "}
            <span className="display-italic">nobody has solved yet.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Every company wants people who are great at working with AI. Nobody has figured out how to
            actually find them.
          </p>
        </div>

        <div
          className="mt-16 md:mt-20 grid md:grid-cols-3 gap-px border-t border-b"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          {blocks.map((b, i) => (
            <div
              key={i}
              className={`py-10 md:py-12 md:px-8 ${i > 0 ? "md:border-l" : ""}`}
              style={{ borderColor: "hsl(var(--hairline))" }}
            >
              <h3 className="font-serif text-xl md:text-2xl text-foreground leading-snug tracking-tight">
                {b.lead}
              </h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
