const dimensions = [
  {
    n: "01",
    title: "Scaffolding quality",
    body: "Do they break the problem down before prompting — or send vague asks and hope for the best?",
  },
  {
    n: "02",
    title: "Debugging skill",
    body: "When AI gets it wrong, do they isolate the cause or paste the same prompt again?",
  },
  {
    n: "03",
    title: "Hallucination recovery",
    body: "Do they catch fabricated APIs, missing imports, false confidence?",
  },
  {
    n: "04",
    title: "Optimisation thinking",
    body: "Do they push past the first working answer toward better ones?",
  },
  {
    n: "05",
    title: "Testing approach",
    body: "Are tests deliberate and meaningful — or copy-pasted to satisfy coverage?",
  },
]

export function PromptIQScore() {
  return (
    <section id="promptiq" className="relative section-canvas">
      <div className="hairline" />
      <div className="container-prose py-24 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">PromptIQ Score</p>
          <h2 className="display text-4xl md:text-5xl">
            One score. <span className="display-italic">Five honest signals.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">
            What we measure, in plain language. No proprietary black box — every dimension
            explainable to a hiring manager in one sentence.
          </p>
        </div>

        <div
          className="mt-16 grid md:grid-cols-5 gap-px border bg-hairline"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          {dimensions.map((d) => (
            <div key={d.n} className="bg-background p-6 md:p-7">
              <span className="font-mono text-[11px] tracking-[0.22em] text-accent">{d.n}</span>
              <h3 className="mt-4 font-serif text-lg md:text-xl text-foreground leading-snug tracking-tight">
                {d.title}
              </h3>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
