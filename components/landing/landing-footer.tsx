import { PromoraMark } from "@/components/landing/promora-mark"

const cols = [
  {
    title: "Product",
    links: ["The Platform", "Pricing", "Compare", "FAQ", "Book a Demo"],
  },
  {
    title: "Company",
    links: ["About", "LinkedIn", "Twitter"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Data Retention"],
  },
]

export function LandingFooter() {
  return (
    <footer className="relative section-ink-deep">
      <div className="container-prose pt-20 pb-12 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <PromoraMark size={28} className="text-foreground" />
            <span className="font-brand text-lg font-medium tracking-tight text-foreground">
              Promora
            </span>
          </div>
          <p className="mt-5 text-muted-foreground max-w-sm leading-relaxed">
            See exactly how your next hire works with AI.
          </p>
        </div>
        <div className="md:col-span-7 grid grid-cols-3 gap-8">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-5">
                {c.title}
              </p>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-foreground/85 hover:text-accent-glow transition-colors text-[15px]"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div
        className="container-prose pt-6 pb-8 flex items-center justify-between border-t"
        style={{ borderColor: "hsl(var(--foreground) / 0.1)" }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          © {new Date().getFullYear()} Promora, Inc.
        </p>
        <div className="flex items-center gap-4 text-muted-foreground">
          <a href="#" aria-label="LinkedIn" className="hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.98 3.5a2.5 2.5 0 11-.001 5.001A2.5 2.5 0 014.98 3.5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21h-4V9z" />
            </svg>
          </a>
          <a href="#" aria-label="Twitter" className="hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2H21l-6.49 7.41L22 22h-6.78l-4.78-6.27L4.86 22H2.1l6.94-7.93L2 2h6.92l4.32 5.71L18.24 2zm-2.38 18h1.62L7.27 4H5.55l10.31 16z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
