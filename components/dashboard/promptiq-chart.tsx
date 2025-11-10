"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Brain } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { week: "W1", score: 65 },
  { week: "W2", score: 72 },
  { week: "W3", score: 78 },
  { week: "W4", score: 85 },
  { week: "W5", score: 88 },
  { week: "W6", score: 92 },
]

export function PromptIQChart() {
  return (
    <Card className="border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-white" />
            <h3 className="text-lg font-semibold text-white">PromptIQ Trends</h3>
          </div>
          <p className="mt-1 text-sm text-zinc-400">Average candidate AI fluency scores</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-emerald-400">
          <TrendingUp className="h-4 w-4" />
          <span>+12%</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="week" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Line type="monotone" dataKey="score" stroke="#fff" strokeWidth={2} dot={{ fill: "#fff", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
