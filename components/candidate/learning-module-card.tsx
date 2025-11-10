"use client"

import { motion } from "framer-motion"
import { BookOpen, Clock, Sparkles, Play } from "lucide-react"
import Link from "next/link"

interface LearningModule {
  id: string
  title: string
  description: string
  duration: string
  difficulty: string
  progress: number
  skills: string[]
  aiRecommended: boolean
  lessons: number
  completed: number
}

interface LearningModuleCardProps {
  module: LearningModule
  index: number
}

export function LearningModuleCard({ module, index }: LearningModuleCardProps) {
  const difficultyColors = {
    Beginner: "bg-green-500/20 text-green-400",
    Intermediate: "bg-yellow-500/20 text-yellow-400",
    Advanced: "bg-red-500/20 text-red-400",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-black/60"
    >
      {module.aiRecommended && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400">
          <Sparkles className="h-3 w-3" />
          AI Recommended
        </div>
      )}

      <h3 className="mb-2 text-lg font-bold text-white">{module.title}</h3>
      <p className="mb-4 text-sm text-zinc-400">{module.description}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {module.skills.map((skill) => (
          <span key={skill} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
            {skill}
          </span>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-4 text-sm text-zinc-400">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {module.duration}
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="h-4 w-4" />
          {module.completed}/{module.lessons} lessons
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${difficultyColors[module.difficulty as keyof typeof difficultyColors]}`}
        >
          {module.difficulty}
        </span>
      </div>

      {module.progress > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Progress</span>
            <span className="text-white">{module.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${module.progress}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            />
          </div>
        </div>
      )}

      <Link
        href={`/candidate/learn/${module.id}`}
        className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-zinc-200"
      >
        <Play className="h-4 w-4" />
        {module.progress > 0 ? "Continue Learning" : "Start Module"}
      </Link>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  )
}
