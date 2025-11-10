"use client"

import { motion } from "framer-motion"
import { Code2, GitBranch, Clock } from "lucide-react"

interface WorkItem {
  id: string
  type: "assessment" | "practice"
  title: string
  language: string
  duration: string
  promptIQ: number
  timestamp: string
  status: "completed" | "in-progress"
}

interface LastWorkDoneProps {
  workItems: WorkItem[]
}

export function LastWorkDone({ workItems }: LastWorkDoneProps) {
  const getStatusColor = (status: string) => {
    return status === "completed" ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10"
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-xl font-bold text-white">Last Work Done</h3>
      <div className="space-y-4">
        {workItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-4 rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10"
          >
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-medium text-white">{item.title}</h4>
                <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {item.language}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.duration}
                </span>
                <span>{item.timestamp}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-400">PromptIQ</p>
              <p className="text-xl font-bold text-white">{item.promptIQ}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
