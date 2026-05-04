"use client"

import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type HeroMetricProps = {
  label: string
  value: string
  subline: string
  delta?: string
  big?: boolean
  invert?: boolean
  className?: string
}

export function HeroMetric({ label, value, subline, delta, big, invert, className }: HeroMetricProps) {
  return (
    <div
      className={cn(
        `group relative flex h-full min-h-[180px] flex-col justify-between overflow-hidden rounded-3xl transition-all duration-300
        backdrop-blur-2xl backdrop-saturate-150
        border ring-1 ring-inset
        shadow-[inset_0_1px_0_0_hsl(var(--background)/0.5),0_8px_32px_-12px_hsl(240_18%_8%/0.18),0_24px_60px_-30px_hsl(var(--accent)/0.35)]
        hover:-translate-y-0.5
        hover:shadow-[inset_0_1px_0_0_hsl(var(--background)/0.6),0_12px_40px_-12px_hsl(240_18%_8%/0.22),0_28px_70px_-30px_hsl(var(--accent)/0.5)]
        before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-background/40 before:via-background/10 before:to-transparent before:content-['']`,
        invert
          ? "border-foreground/20 bg-foreground/80 text-background ring-background/10"
          : "border-foreground/10 bg-background/30 ring-background/30",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{
          background: invert
            ? "radial-gradient(circle, hsl(var(--accent-glow)), transparent 70%)"
            : "radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.2em]",
            invert ? "text-background/60" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        {delta && (
          <span
            className={cn(
              "flex items-center gap-0.5 font-mono text-[10px] tracking-[0.14em]",
              invert ? "text-accent-glow" : "text-accent-deep dark:text-white"
            )}
          >
            <ArrowUpRight className="h-3 w-3 shrink-0" /> {delta}
          </span>
        )}
      </div>

      <div className="relative space-y-1.5">
        <div
          className={cn(
            "font-serif tracking-tight leading-none tabular-nums",
            big ? "text-7xl" : "text-5xl",
            invert ? "text-background" : "text-foreground"
          )}
        >
          {value}
        </div>
        <p className={cn("text-xs", invert ? "text-background/65" : "text-muted-foreground")}>{subline}</p>
      </div>
    </div>
  )
}
