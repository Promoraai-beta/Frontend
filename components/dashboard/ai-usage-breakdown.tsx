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
      iconColor: "text-emerald-600 dark:text-emerald-400",
      barColor: "bg-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "In Progress",
      count: active,
      pct: Math.round((active / total) * 100),
      icon: Clock,
      iconColor: "text-blue-600 dark:text-blue-400",
      barColor: "bg-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Pending",
      count: pending,
      pct: Math.round((pending / total) * 100),
      icon: Hourglass,
      iconColor: "text-amber-600 dark:text-amber-400",
      barColor: "bg-amber-500",
      bgColor: "bg-amber-500/10",
    },
    ...(other > 0
      ? [{
          label: "Other",
          count: other,
          pct: Math.round((other / total) * 100),
          icon: Users,
          iconColor: "text-muted-foreground",
          barColor: "bg-muted-foreground",
          bgColor: "bg-muted",
        }]
      : []),
  ]

  return (
    <Card className="rounded-2xl border border-border bg-card p-6 shadow-none">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h3 className="font-serif text-lg font-medium tracking-tight text-foreground">Candidate pipeline</h3>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="font-serif text-3xl font-medium tabular-nums tracking-tight text-foreground">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <div className="space-y-4">
          {stats.map((stat, i) => (
            <div key={stat.label}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 ${stat.bgColor}`}>
                    <stat.icon className={`h-3 w-3 ${stat.iconColor}`} />
                  </div>
                  <span className="text-sm text-foreground">{stat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{stat.count}</span>
                  <span className="w-9 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{stat.pct}%</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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
