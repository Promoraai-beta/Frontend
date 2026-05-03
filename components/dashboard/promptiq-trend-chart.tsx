"use client"

import { Card } from "@/components/ui/card"
import { Brain, TrendingUp } from "lucide-react"
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
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
        <p className="text-zinc-400">{label}</p>
        <p className="font-bold text-white">
          {payload[0].value}{" "}
          <span className="font-normal text-zinc-400">PromptIQ</span>
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
    <Card className="border-zinc-800/60 bg-zinc-950/60 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-zinc-300" />
            <h3 className="text-base font-semibold text-white">PromptIQ Trend</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Avg candidate AI fluency score per week
          </p>
        </div>
        {trend !== null ? (
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
            trend >= 0
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <TrendingUp className="h-3 w-3" />
            <span>{trend >= 0 ? "+" : ""}{trend}%</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">No data yet</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="promptiqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#a855f7"
            strokeWidth={2}
            fill="url(#promptiqGrad)"
            dot={false}
            connectNulls
            activeDot={{ r: 4, fill: "#a855f7", strokeWidth: 0 }}
          />
          {lastScored?.score && (
            <ReferenceDot
              x={lastScored.label}
              y={lastScored.score}
              r={5}
              fill="#a855f7"
              stroke="#a855f7"
              strokeWidth={0}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
