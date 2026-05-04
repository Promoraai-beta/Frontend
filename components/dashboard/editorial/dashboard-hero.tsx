"use client"

import { ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandStamp } from "@/components/dashboard/editorial/brand-stamp"

interface DashboardHeroProps {
  greeting: string
  awaitingReview: number
  activeLive: number
  onNewPosition: () => void
  onReviewQueue: () => void
}

export function DashboardHero({
  greeting,
  awaitingReview,
  activeLive,
  onNewPosition,
  onReviewQueue,
}: DashboardHeroProps) {
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="accentSolid"
        onClick={onNewPosition}
        className="h-11 shrink-0 gap-2 rounded-full px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" /> New position
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onReviewQueue}
        className="h-11 shrink-0 rounded-full px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground dark:text-white dark:hover:text-white/90"
      >
        Review queue <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" />
      </Button>
    </div>
  )

  return (
    <section className="relative overflow-x-clip">
      <div className="relative z-[1] grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 space-y-5 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">Recruiter cockpit</span>
            <span className="h-px w-12 shrink-0 bg-hairline" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-deep dark:text-white">
              ● Live · {dateStr}
            </span>
          </div>

          <h1 className="display text-5xl leading-[0.95] text-foreground md:text-7xl">
            {greeting},<br />
            <span className="display-italic">Recruiter.</span>
          </h1>

          <p className="max-w-lg text-base text-muted-foreground">
            <span className="font-medium text-foreground">{awaitingReview} candidates</span> are awaiting your review
            {activeLive > 0 ? (
              <>
                {" "}
                and{" "}
                <span className="font-medium text-foreground">
                  {activeLive} {activeLive === 1 ? "is" : "are"} ready
                </span>{" "}
                for a live round today.
              </>
            ) : (
              <>.</>
            )}
          </p>
        </div>

        <div className="relative z-[1] hidden flex-col items-end gap-6 lg:col-span-4 lg:flex">
          <div className="pointer-events-none flex w-full justify-end">
            <BrandStamp />
          </div>
          {actions}
        </div>
      </div>

      <div className="relative z-[1] mt-8 lg:hidden">{actions}</div>
    </section>
  )
}
