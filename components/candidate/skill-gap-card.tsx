"use client"

import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"

interface SkillGap {
  skill: string
  current: number
  target: number
  priority: "high" | "medium" | "low"
}

interface SkillGapCardProps {
  skillGap: SkillGap
  index: number
}

export function SkillGapCard({ skillGap, index }: SkillGapCardProps) {
  const gap = skillGap.target - skillGap.current
  const priorityColors = {
    high: "border-red-500/30 bg-red-500/10",
    medium: "border-yellow-500/30 bg-yellow-500/10",
    low: "border-green-500/30 bg-green-500/10",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`rounded-xl border p-6 ${priorityColors[skillGap.priority]}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{skillGap.skill}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            skillGap.priority === "high"
              ? "bg-red-500/20 text-red-400"
              : skillGap.priority === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400"
          }`}
        >
          {skillGap.priority} priority
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400">Current: {skillGap.current}</span>
        <span className="text-zinc-400">Target: {skillGap.target}</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${skillGap.current}%` }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
          className="h-full rounded-full bg-blue-500"
        />
        <div
          className="absolute top-0 h-full border-r-2 border-dashed border-white/40"
          style={{ left: `${skillGap.target}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
        <TrendingUp className="h-4 w-4" />
        <span>Gap: {gap} points to close</span>
      </div>
    </motion.div>
  )
}
