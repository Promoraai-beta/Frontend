"use client"

import { motion } from "framer-motion"
import { Target, Flame, Users } from "lucide-react"

interface StatsOverviewProps {
  stats: {
    totalPoints?: number
    promptIQScore?: number
    assessmentsCompleted?: number
    practiceHours?: number
    currentStreak?: number
    rank?: number
    totalUsers?: number
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      label: "Assessments",
      value: stats.assessmentsCompleted ?? 0,
      icon: Target,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Current Streak",
      value: `${stats.currentStreak ?? 0}`,
      unit: "days",
      icon: Flame,
      color: "from-red-500 to-orange-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Global Rank",
      value: `#${stats.rank ?? 0}`,
      subValue: `of ${(stats.totalUsers ?? 0).toLocaleString()}`,
      icon: Users,
      color: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-500/10",
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-black/60"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-baseline gap-2">
              <p className="text-6xl font-black text-white">{stat.value}</p>
              {stat.unit && <span className="text-lg text-zinc-500">{stat.unit}</span>}
            </div>
            <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
            {stat.subValue && <p className="mt-1 text-xs text-zinc-500">{stat.subValue}</p>}
          </div>

          <div
            className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${stat.color} opacity-0 transition-opacity group-hover:opacity-100`}
          />
        </motion.div>
      ))}
    </div>
  )
}
