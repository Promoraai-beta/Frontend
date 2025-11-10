"use client"

import { motion } from "framer-motion"
import { Clock, Award, Users, TrendingUp, BookOpen } from "lucide-react"
import Link from "next/link"

interface AssessmentCardProps {
  assessment: {
    id: string
    title: string
    description: string
    difficulty: string
    category: string
    tags: string[]
    duration: number
    questions: number
    points: number
    createdBy: string
    creatorType: string
    completions: number
    avgPromptIQ: number
  }
  index: number
}

export function AssessmentCard({ assessment, index }: AssessmentCardProps) {
  const difficultyColors = {
    Beginner: "bg-green-500/20 text-green-400 border-green-500/30",
    Intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  }

  const creatorBadges = {
    official: { bg: "bg-blue-500/20", text: "text-blue-400", icon: "✓" },
    recruiter: { bg: "bg-purple-500/20", text: "text-purple-400", icon: "★" },
    candidate: { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: "◆" },
  }

  const badge = creatorBadges[assessment.creatorType as keyof typeof creatorBadges]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-black/60"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-blue-400">
            {assessment.title}
          </h3>
          <p className="mb-3 text-sm text-zinc-400">{assessment.description}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        {assessment.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
            {tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="h-4 w-4" />
          <span>{assessment.duration} min</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <BookOpen className="h-4 w-4" />
          <span>{assessment.questions} questions</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Users className="h-4 w-4" />
          <span>{assessment.completions.toLocaleString()} completed</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <TrendingUp className="h-4 w-4" />
          <span>Avg IQ: {assessment.avgPromptIQ}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${difficultyColors[assessment.difficulty as keyof typeof difficultyColors]}`}
          >
            {assessment.difficulty}
          </span>
          <span className={`rounded-full ${badge.bg} px-3 py-1 text-xs ${badge.text}`}>
            {badge.icon} {assessment.createdBy}
          </span>
        </div>
        <Link
          href={`/candidate/practice/${assessment.id}`}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-zinc-200"
        >
          <Award className="h-4 w-4" />+{assessment.points}
        </Link>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  )
}
