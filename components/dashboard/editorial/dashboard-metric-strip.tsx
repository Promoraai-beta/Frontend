"use client"

import { HeroMetric } from "@/components/dashboard/editorial/hero-metric"

interface Props {
  weekCompleted: number
  weekDeltaPct: number | null
  avgPromptIQ: number
  iqDeltaLabel?: string
  activeRoles: number
  hiringThisWeek?: number
  inReview: number
  loading?: boolean
}

export function DashboardMetricStrip({
  weekCompleted,
  weekDeltaPct,
  avgPromptIQ,
  iqDeltaLabel,
  activeRoles,
  hiringThisWeek,
  inReview,
  loading,
}: Props) {
  const dash = loading ? "—" : undefined
  const deltaWeek =
    weekDeltaPct == null || loading ? undefined : `${weekDeltaPct >= 0 ? "+" : ""}${weekDeltaPct}%`

  return (
    <section className="mt-20 grid grid-cols-12 items-stretch gap-4">
      <HeroMetric
        className="col-span-12 h-full min-h-[180px] p-8 md:col-span-5"
        label="This week"
        value={dash ?? String(weekCompleted)}
        subline="assessments completed"
        delta={deltaWeek}
        big
      />
      <HeroMetric
        className="col-span-6 h-full min-h-[180px] p-8 md:col-span-3"
        label="Avg PromptIQ"
        value={dash ?? String(avgPromptIQ || 0)}
        subline="of 100 — calibrated"
        delta={iqDeltaLabel}
      />
      <HeroMetric
        className="col-span-6 h-full min-h-[180px] p-8 md:col-span-2"
        label="Active roles"
        value={dash ?? String(activeRoles)}
        subline={hiringThisWeek != null ? `${hiringThisWeek} hiring this week` : "Open assessments"}
      />
      <HeroMetric
        className="col-span-12 h-full min-h-[180px] p-8 md:col-span-2"
        label="In review"
        value={dash ?? String(inReview)}
        subline="needs your eyes"
        invert
      />
    </section>
  )
}
