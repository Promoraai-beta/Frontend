"use client"

import type { ReactNode } from "react"
import { Sparkles, ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SectionHead } from "@/components/dashboard/editorial/section-head"
import type { ActivityItem } from "@/components/dashboard/editorial/dashboard-data"

interface Props {
  activity: ActivityItem[]
  headline: ReactNode
  body: string
  topScore: number | null
  topName: string | null
  reportHref?: string
}

export function ActivityInsightSection({ activity, headline, body, topScore, topName, reportHref }: Props) {
  return (
    <section className="mt-24 grid grid-cols-12 gap-6">
      <div className="col-span-12 rounded-3xl border border-hairline bg-card p-8 lg:col-span-7">
        <SectionHead eyebrow="Live feed" title="Real-time" italic="activity." dense />

        {activity.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline">
            {activity.map((a, idx) => (
              <li key={`${a.who}-${a.when}-${idx}`} className="group flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-serif text-sm text-accent-deep">
                  {a.who
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium text-foreground">{a.who}</span>{" "}
                    <span className="text-muted-foreground">{a.did} for</span>{" "}
                    <span className="font-serif italic text-accent">{a.role}</span>
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {a.when} ago · IQ {a.iq}
                  </p>
                </div>
                {a.sessionId ? (
                  <Link
                    href={`/dashboard/results/${a.sessionId}`}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Open session"
                  >
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors hover:text-accent" />
                  </Link>
                ) : (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-accent" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative col-span-12 overflow-hidden rounded-3xl bg-foreground p-8 text-background lg:col-span-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, hsl(var(--accent-glow)), transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-glow" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-glow">PromptIQ insight</span>
          </div>

          <div className="display mt-6 text-3xl leading-tight text-background">{headline}</div>

          <p className="mt-4 text-sm leading-relaxed text-background/70">{body}</p>

          <div className="mt-8 flex flex-col gap-4 border-t border-background/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {topScore != null ? (
                <>
                  <p className="font-serif text-4xl tabular-nums">{topScore}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-background/60">
                    Top score · {topName || "—"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-background/60">Complete assessments to unlock PromptIQ trends.</p>
              )}
            </div>
            {reportHref && (
              <Button
                variant="ghost"
                asChild
                className="rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-background hover:bg-background/10"
              >
                <Link href={reportHref}>
                  Open report <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
