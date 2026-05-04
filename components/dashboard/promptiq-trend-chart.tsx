"use client"

import { Card } from "@/components/ui/card"
import { Brain, TrendingDown, TrendingUp } from "lucide-react"
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
  aiInteractions: any[]
}

function computeWeeklyPromptIQ(interactions: any[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (5 - i) * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    const weekInteractions = interactions.filter((a) => {
      const d = new Date(a.timestamp || a.createdAt)
      return d >= weekStart && d < weekEnd
    })

    const prompts = weekInteractions.filter((a) =>
      a.eventType === "prompt_sent" || a.promptText || a.promptTokens
    )

    if (prompts.length === 0) return { label, score: null }

    // Avg prompt tokens — clamp 0–300 → normalize 0–100
    const avgTokens =
      prompts.reduce((sum: number, p: any) => sum + (p.promptTokens ?? 0), 0) / prompts.length

    // Conversation depth: avg conversationTurn (higher = more iterative)
    const avgTurn =
      prompts.reduce((sum: number, p: any) => sum + (p.conversationTurn ?? 1), 0) / prompts.length

    // Score: 60% token quality + 40% conversation depth
    const tokenScore = Math.min((avgTokens / 200) * 100, 100)
    const turnScore  = Math.min((avgTurn / 5) * 100, 100)
    const score      = Math.round(tokenScore * 0.6 + turnScore * 0.4)

    return { label, score: Math.max(score, 5) }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length && payload[0].value != null) {
    return (
      <div className="rounded-xl border border-hairline bg-card px-3 py-2 text-sm shadow-xl backdrop-blur-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">
          {payload[0].value}{" "}
          <span className="font-normal text-muted-foreground">PromptIQ</span>
        </p>
      </div>
    )
  }
  return null
}

export function PromptIQTrendChart({ aiInteractions }: Props) {
  const data = computeWeeklyPromptIQ(aiInteractions)
  const scored = data.filter((d) => d.score !== null)
  const lastScored = scored[scored.length - 1]
  const firstScored = scored[0]
  const trend =
    scored.length >= 2 && firstScored?.score && lastScored?.score
      ? Math.round(((lastScored.score - firstScored.score) / firstScored.score) * 100)
      : null

  return (
    <Card className="rounded-2xl border-hairline bg-card p-6 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <h3 className="font-serif text-xl text-foreground">PromptIQ trend</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Average AI fluency proxy per week</p>
        </div>
        {trend !== null ? (
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${
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
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">No data yet</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="promptiqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
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
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#promptiqGrad)"
            dot={false}
            connectNulls
            activeDot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }}
          />
          {lastScored?.score && (
            <ReferenceDot
              x={lastScored.label}
              y={lastScored.score}
              r={5}
              fill="hsl(var(--accent))"
              stroke="hsl(var(--accent-glow))"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
