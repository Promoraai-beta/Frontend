"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface SectionHeadProps {
  eyebrow: string
  title: string
  italic: string
  cta?: string
  ctaHref?: string
  dense?: boolean
}

export function SectionHead({ eyebrow, title, italic, cta, ctaHref, dense }: SectionHeadProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className={`display text-foreground ${dense ? "text-2xl" : "text-3xl md:text-4xl"}`}>
          {title} <span className="display-italic">{italic}</span>
        </h2>
      </div>
      {cta && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.05] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent dark:border-foreground/20 dark:bg-foreground/[0.08] dark:hover:bg-accent/15"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </Link>
      )}
    </div>
  )
}
