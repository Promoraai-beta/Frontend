"use client"

import { Card } from "@/components/ui/card"
import { Users, Clock, CheckCircle2, Hourglass } from "lucide-react"
import { motion } from "framer-motion"

interface Props {
  sessions: any[]
}

export function AIUsageBreakdown({ sessions }: Props) {
  const total = sessions.length || 1

  const submitted = sessions.filter((s) => s.status === "submitted").length
  const active    = sessions.filter((s) => s.status === "active").length
  const pending   = sessions.filter((s) => s.status === "pending").length
  const other     = sessions.length - submitted - active - pending

  const stats = [
    {
      label: "Submitted",
      count: submitted,
      pct: Math.round((submitted / total) * 100),
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      barColor: "bg-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "In Progress",
      count: active,
      pct: Math.round((active / total) * 100),
      icon: Clock,
      iconColor: "text-blue-400",
      barColor: "bg-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Pending",
      count: pending,
      pct: Math.round((pending / total) * 100),
      icon: Hourglass,
      iconColor: "text-amber-400",
      barColor: "bg-amber-500",
      bgColor: "bg-amber-500/10",
    },
    ...(other > 0
      ? [{
          label: "Other",
          count: other,
          pct: Math.round((other / total) * 100),
          icon: Users,
          iconColor: "text-zinc-400",
          barColor: "bg-zinc-500",
          bgColor: "bg-zinc-500/10",
        }]
      : []),
  ]

  return (
    <Card className="border-zinc-800/60 bg-zinc-950/60 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-300" />
            <h3 className="text-base font-semibold text-white">Candidate Pipeline</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-2xl font-bold text-white">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-600 text-center py-8">No sessions yet</p>
      ) : (
        <div className="space-y-4">
          {stats.map((stat, i) => (
            <div key={stat.label}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-md p-1 ${stat.bgColor}`}>
                    <stat.icon className={`h-3 w-3 ${stat.iconColor}`} />
                  </div>
                  <span className="text-sm text-zinc-300">{stat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{stat.count}</span>
                  <span className="text-sm font-semibold tabular-nums text-white w-9 text-right">
                    {stat.pct}%
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${stat.barColor}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
