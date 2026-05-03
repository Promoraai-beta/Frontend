import Link from "next/link"

const PromoraLogo = () => (
  <svg width="16" height="16" viewBox="0 0 100 100" fill="currentColor">
    <polygon points="50,50 15,18 26,10"/>
    <polygon points="50,50 58,5 67,12"/>
    <polygon points="50,50 73,17 80,26"/>
    <polygon points="50,50 86,38 87,50"/>
    <polygon points="50,50 79,67 69,77"/>
    <polygon points="50,50 46,88 36,84"/>
    <polygon points="50,50 8,62 18,80"/>
  </svg>
)

const links = {
  Product: [
    { label: "PromptIQ Score", href: "#promptiq" },
    { label: "How it works", href: "#problem" },
    { label: "Compare", href: "#compare" },
    { label: "Sample report", href: "#report" },
  ],
  Company: [
    { label: "Vision", href: "#vision" },
    { label: "Book a demo", href: "https://calendly.com/promoraai05/30min" },
    { label: "Login", href: "/login" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">

      {/* Top — wordmark + columns */}
      <div className="container mx-auto px-4 pt-16 pb-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_auto_auto]">

          {/* Brand block */}
          <div className="max-w-xs">
            <Link href="/" className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <PromoraLogo />
              </div>
              <span className="text-lg font-bold text-foreground">PromoraAI</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The AI fluency score for hiring teams. One number, five dimensions, agent-written verdict.
            </p>
            <p className="mt-4 text-xs font-semibold tracking-[0.15em] text-muted-foreground/40">
              ENGINEERING NOW · ALL ROLES, SOON.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-muted-foreground/50">
                {group.toUpperCase()}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Base row */}
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-5 md:flex-row">
          <p className="text-xs text-muted-foreground/50">© 2026 PromoraAI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground/50">
            <Link href="#" className="transition-colors hover:text-muted-foreground">Privacy</Link>
            <Link href="#" className="transition-colors hover:text-muted-foreground">Terms</Link>
            <Link href="mailto:hello@promoraai.com" className="transition-colors hover:text-muted-foreground">Contact</Link>
          </div>
        </div>
      </div>

    </footer>
  )
}
