"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

const notifications = [
  {
    id: "1",
    type: "completed",
    candidate: "Sarah Johnson",
    assessment: "React Advanced",
    time: "2 minutes ago",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    id: "2",
    type: "in-progress",
    candidate: "Michael Chen",
    assessment: "Python Backend",
    time: "15 minutes ago",
    icon: Clock,
    color: "text-yellow-500",
  },
  {
    id: "3",
    type: "completed",
    candidate: "Emily Davis",
    assessment: "TypeScript Fundamentals",
    time: "1 hour ago",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    id: "4",
    type: "violation",
    candidate: "David Wilson",
    assessment: "Node.js APIs",
    time: "2 hours ago",
    icon: AlertCircle,
    color: "text-red-500",
  },
]

export function NotificationsPanel() {
  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader>
        <CardTitle className="text-white">Recent Activity</CardTitle>
        <p className="text-sm text-zinc-400">Latest assessment submissions</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:bg-zinc-900"
          >
            <notification.icon className={`mt-0.5 h-4 w-4 ${notification.color}`} />
            <div className="flex-1 text-sm">
              <p className="text-white">
                <span className="font-medium">{notification.candidate}</span> submitted{" "}
                <span className="text-zinc-400">{notification.assessment}</span>
              </p>
              <p className="text-xs text-zinc-500">{notification.time}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}
