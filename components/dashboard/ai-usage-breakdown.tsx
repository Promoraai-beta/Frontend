"use client"

import { Card } from "@/components/ui/card"
import { Bot, Code2, Bug, Sparkles } from "lucide-react"

const usageStats = [
  { label: "Scaffolding", value: 45, icon: Code2, color: "from-purple-500 to-pink-500" },
  { label: "Debugging", value: 30, icon: Bug, color: "from-purple-500 to-pink-500" },
  { label: "Optimization", value: 15, icon: Sparkles, color: "from-purple-500 to-pink-500" },
  { label: "Testing", value: 10, icon: Bot, color: "from-purple-500 to-pink-500" },
]

export function AIUsageBreakdown() {
  return (
    <Card className="border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-lg font-semibold text-white">AI Usage Breakdown</h3>
      <p className="mb-6 text-sm text-zinc-400">How candidates leverage AI tools during assessments</p>
      <div className="space-y-4">
        {usageStats.map((stat) => (
          <div key={stat.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <stat.icon className="h-4 w-4 text-zinc-400" />
                <span className="text-zinc-300">{stat.label}</span>
              </div>
              <span className="font-medium text-white">{stat.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full bg-gradient-to-r ${stat.color}`} style={{ width: `${stat.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
