"use client"

import { motion } from "framer-motion"
import { Award, BookOpen, Trophy, Target } from "lucide-react"

interface Activity {
  id: string
  type: "assessment" | "practice" | "achievement"
  title: string
  points: number
  promptIQ?: number
  timestamp: string
  status: string
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "assessment":
        return Target
      case "practice":
        return BookOpen
      case "achievement":
        return Trophy
      default:
        return Award
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case "assessment":
        return "bg-blue-500/10 text-blue-400"
      case "practice":
        return "bg-green-500/10 text-green-400"
      case "achievement":
        return "bg-yellow-500/10 text-yellow-400"
      default:
        return "bg-zinc-500/10 text-zinc-400"
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-xl font-bold text-white">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = getIcon(activity.type)
          const colorClass = getColor(activity.type)

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-start gap-4 rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
            >
              <div className={`rounded-lg ${colorClass} p-2`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{activity.title}</h4>
                <p className="text-sm text-zinc-400">{activity.timestamp}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">+{activity.points}</p>
                {activity.promptIQ && <p className="text-xs text-zinc-400">IQ: {activity.promptIQ}</p>}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
