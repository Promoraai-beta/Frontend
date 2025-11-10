"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  {
    id: "5",
    type: "completed",
    candidate: "Lisa Anderson",
    assessment: "Vue.js Advanced",
    time: "3 hours ago",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  {
    id: "6",
    type: "completed",
    candidate: "James Taylor",
    assessment: "AWS Fundamentals",
    time: "4 hours ago",
    icon: CheckCircle2,
    color: "text-green-500",
  },
]

interface NotificationsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-zinc-800 bg-black shadow-2xl sm:w-96"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <p className="text-sm text-zinc-400">Latest assessment submissions</p>
                </div>
                <Button onClick={onClose} variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 transition-colors hover:bg-zinc-900"
                    >
                      <notification.icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${notification.color}`} />
                      <div className="flex-1 text-sm">
                        <p className="text-white">
                          <span className="font-medium">{notification.candidate}</span> submitted{" "}
                          <span className="text-zinc-400">{notification.assessment}</span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{notification.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 p-4">
                <Button className="w-full bg-white text-black hover:bg-zinc-200">Mark All as Read</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
