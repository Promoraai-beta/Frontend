"use client"

import { ArrowUpRight } from "lucide-react"
import { SectionHead } from "@/components/dashboard/editorial/section-head"

export interface EditorialPositionRow {
  id: string
  title: string
  status: "Live" | "Draft"
  iq: number | null
  candidates: number
  days: number
  tags: string[]
}

interface Props {
  positions: EditorialPositionRow[]
  loading?: boolean
  onOpenPosition: (id: string) => void
}

export function PositionsEditorialTable({ positions, loading, onOpenPosition }: Props) {
  const shown = positions.slice(0, 14)
  const total = positions.length

  return (
    <section className="mt-24">
      <SectionHead
        eyebrow="Pipeline"
        title="Recent"
        italic="positions."
        cta={total > 14 ? `View all ${total}` : undefined}
        ctaHref={total > 14 ? "/dashboard/positions" : undefined}
      />

      <div className="mt-8 overflow-hidden rounded-3xl border border-hairline bg-card">
        <div className="grid grid-cols-12 border-b border-hairline bg-muted/30 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:px-6">
          <div className="col-span-12 sm:col-span-5">Role</div>
          <div className="col-span-4 mt-2 sm:col-span-2 sm:mt-0">Status</div>
          <div className="col-span-4 mt-2 text-right sm:col-span-2 sm:mt-0">PromptIQ</div>
          <div className="col-span-4 mt-2 text-right sm:col-span-2 sm:mt-0">Candidates</div>
          <div className="col-span-12 mt-2 flex justify-end sm:col-span-1 sm:mt-0">Open</div>
        </div>

        {loading ? (
          <div className="divide-y divide-border px-4 py-10 text-center text-sm text-muted-foreground md:px-6">
            Loading positions…
          </div>
        ) : shown.length === 0 ? (
          <div className="px-4 py-14 text-center text-sm text-muted-foreground md:px-6">No positions yet.</div>
        ) : (
          shown.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenPosition(p.id)}
              className="group grid w-full grid-cols-12 items-center border-b border-hairline px-4 py-5 text-left transition-colors last:border-0 hover:bg-muted/30 md:px-6"
            >
              <div className="col-span-12 flex items-start gap-4 sm:col-span-5">
                <span className="mt-1.5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg leading-snug text-foreground">{p.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[11px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                    {p.status === "Live" && p.days > 0 && (
                      <span className="text-[11px] text-muted-foreground">· {p.days}d open</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="col-span-4 mt-3 sm:col-span-2 sm:mt-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
                    p.status === "Draft"
                      ? "bg-muted text-muted-foreground"
                      : "bg-accent-soft text-accent-deep dark:bg-accent/35 dark:text-accent-glow dark:ring-1 dark:ring-accent/45"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.status === "Draft" ? "bg-muted-foreground" : "bg-accent animate-pulse dark:bg-accent-glow"}`}
                  />
                  {p.status}
                </span>
              </div>
              <div className="col-span-4 mt-3 text-right sm:col-span-2 sm:mt-0">
                {p.iq != null ? (
                  <span className="font-serif text-2xl tabular-nums text-foreground">{p.iq}</span>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">—</span>
                )}
              </div>
              <div className="col-span-4 mt-3 text-right font-serif text-2xl tabular-nums text-foreground sm:col-span-2 sm:mt-0">
                {p.candidates || <span className="font-mono text-xs text-muted-foreground">—</span>}
              </div>
              <div className="col-span-12 mt-3 flex justify-end sm:col-span-1 sm:mt-0">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
