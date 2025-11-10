"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertTriangle, UserPlus } from "lucide-react"
import { motion } from "framer-motion"

export function ActivityFeed() {
  const activities = [
    {
      id: 1,
      type: "completed",
      title: "Sarah Johnson completed assessment",
      description: "Senior Frontend Developer - Score: 92%",
      time: "5 minutes ago",
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      id: 2,
      type: "violation",
      title: "Compliance violation detected",
      description: "Alex Martinez - Opened new tab during assessment",
      time: "12 minutes ago",
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      id: 3,
      type: "started",
      title: "New assessment started",
      description: "Emily Chen - Backend Developer",
      time: "23 minutes ago",
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      id: 4,
      type: "invited",
      title: "3 new candidates invited",
      description: "Product Designer positions",
      time: "1 hour ago",
      icon: UserPlus,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      id: 5,
      type: "completed",
      title: "Michael Brown completed assessment",
      description: "DevOps Engineer - Score: 87%",
      time: "2 hours ago",
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ]

  return (
    <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex gap-4 rounded-lg border border-zinc-800 bg-black/50 p-4 transition-colors hover:bg-zinc-900/50"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${activity.bg}`}>
                <activity.icon className={`h-5 w-5 ${activity.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{activity.title}</p>
                <p className="text-xs text-zinc-400">{activity.description}</p>
                <p className="mt-1 text-xs text-zinc-500">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
