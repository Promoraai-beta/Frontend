"use client"

import { Card } from "@/components/ui/card"
import { TrendingDown, TrendingUp, FileCheck } from "lucide-react"
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts"

interface Props {
  sessions: any[]
}

function getWeeklySubmissions(sessions: any[]) {
  const weeks: { label: string; count: number }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - i * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const count = sessions.filter((s) => {
      const d = new Date(s.submittedAt || s.createdAt)
      return d >= weekStart && d < weekEnd && s.status === "submitted"
    }).length

    weeks.push({ label, count })
  }
  return weeks
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-semibold text-popover-foreground">
          {payload[0].value}{" "}
          <span className="font-normal text-muted-foreground">
            submission{payload[0].value !== 1 ? "s" : ""}
          </span>
        </p>
      </div>
    )
  }
  return null
}

export function PromptIQChart({ sessions }: Props) {
  const data = getWeeklySubmissions(sessions)
  const total = data.reduce((s, d) => s + d.count, 0)
  const prevTotal = sessions.filter((s) => {
    const d = new Date(s.submittedAt || s.createdAt)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 42)
    const mid = new Date()
    mid.setDate(mid.getDate() - 21)
    return d >= cutoff && d < mid && s.status === "submitted"
  }).length
  const trend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null
  const lastPoint = data[data.length - 1]

  return (
    <Card className="rounded-2xl border border-border bg-card p-6 shadow-none">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-accent" />
            <h3 className="font-serif text-lg font-medium tracking-tight text-foreground">Submissions over time</h3>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Completed assessments per week
          </p>
        </div>
        {trend !== null && (
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide ${
              trend >= 0
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {trend >= 0 ? "+" : ""}
              {trend}%
            </span>
          </div>
        )}
        {total === 0 && <span className="text-xs text-muted-foreground">No data yet</span>}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="submissionsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.22} />
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
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#submissionsGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }}
          />
          {lastPoint?.count > 0 && (
            <ReferenceDot
              x={lastPoint.label}
              y={lastPoint.count}
              r={5}
              fill="hsl(var(--accent))"
              stroke="hsl(var(--accent))"
              strokeWidth={0}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
