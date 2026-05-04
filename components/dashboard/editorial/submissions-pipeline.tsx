"use client"

import { useId, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartPeriod } from "@/components/dashboard/editorial/dashboard-data"
import { submissionBucketsForPeriod } from "@/components/dashboard/editorial/dashboard-data"

interface Props {
  sessions: Array<{ status?: string; submittedAt?: string | Date | null; createdAt?: string | Date | null }>
}

export function SubmissionsPipelineSection({ sessions }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>("30d")
  const gradientId = useId().replace(/:/g, "")
  const data = useMemo(() => submissionBucketsForPeriod(sessions, period), [sessions, period])

  const totalSessions = sessions.length
  const submitted = sessions.filter((s) => s.status === "submitted").length
  const active = sessions.filter((s) => s.status === "active").length
  const pending = sessions.filter((s) => s.status === "pending").length
  const other = Math.max(0, totalSessions - submitted - active - pending)

  const denom = totalSessions || 1
  const pipeline = [
    { label: "Submitted", count: submitted, pct: Math.round((submitted / denom) * 100), color: "hsl(var(--accent))" },
    { label: "In progress", count: active, pct: Math.round((active / denom) * 100), color: "hsl(var(--accent-glow))" },
    { label: "Pending", count: pending, pct: Math.round((pending / denom) * 100), color: "hsl(38 90% 60%)" },
    ...(other > 0
      ? [{ label: "Other", count: other, pct: Math.round((other / denom) * 100), color: "hsl(248 12% 60%)" }]
      : []),
  ]

  const periods: ChartPeriod[] = ["7d", "30d", "90d"]

  return (
    <section className="mt-6 grid grid-cols-12 gap-6">
      <div className="col-span-12 rounded-3xl border border-hairline bg-card p-8 lg:col-span-8">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Trend</p>
            <h3 className="font-serif text-2xl text-foreground">
              Submissions <span className="display-italic">over time.</span>
            </h3>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
            {periods.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPeriod(v)}
                className={`h-7 rounded-full px-3 font-mono text-xs transition-colors ${
                  period === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="-ml-3 mt-6 h-[240px] md:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--hairline))" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                  fontFamily: "var(--font-serif)",
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--hairline))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--accent))"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: "hsl(var(--accent))", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="col-span-12 rounded-3xl border border-hairline bg-card p-8 lg:col-span-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h3 className="font-serif text-2xl text-foreground">
              <span className="display-italic">Where</span> they are.
            </h3>
          </div>
          <div className="text-right">
            <p className="font-serif text-4xl leading-none tabular-nums text-foreground">{totalSessions}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">total</p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {pipeline.map((p) => (
            <div key={p.label}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {p.count} <span className="opacity-50">· {p.pct}%</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
