"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Target, Brain, TrendingUp, Calendar, Sparkles, Settings } from "lucide-react"
import Link from "next/link"
import { learningPaths } from "@/lib/learning-mock-data"
import { SkillGapCard } from "@/components/candidate/skill-gap-card"
import { LearningModuleCard } from "@/components/candidate/learning-module-card"

export default function AILearning() {
  const [showGoalModal, setShowGoalModal] = useState(false)

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/candidate" className="text-2xl font-bold text-white">
                PromoraAI
              </Link>
              <nav className="hidden items-center gap-6 md:flex">
                <Link href="/candidate" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Dashboard
                </Link>
                <Link href="/candidate/practice" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Practice
                </Link>
                <Link
                  href="/candidate/assessments"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  My Assessments
                </Link>
                <Link href="/candidate/learn" className="text-sm text-white transition-colors hover:text-zinc-400">
                  AI Learning
                </Link>
                <Link href="/candidate/profile" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Profile
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-4xl font-bold text-transparent">
            AI-Powered Career Path
          </h1>
          <p className="text-lg text-zinc-400">Let AI agents guide your journey to your dream role</p>
        </motion.div>

        {/* Current Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-pink-950/20 p-6 backdrop-blur-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Current Career Goal</h2>
                <p className="text-sm text-zinc-400">
                  {learningPaths.currentGoal.role} at {learningPaths.currentGoal.company}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
              Change Goal
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Overall Progress</span>
            <span className="text-white">{learningPaths.currentGoal.progress}%</span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${learningPaths.currentGoal.progress}%` }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar className="h-4 w-4" />
            Target Date: {new Date(learningPaths.currentGoal.targetDate).toLocaleDateString()}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
            <Brain className="h-6 w-6 text-blue-400" />
            AI Insights
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {learningPaths.aiInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`rounded-xl border p-4 ${
                  insight.type === "strength"
                    ? "border-green-500/30 bg-green-500/10"
                    : insight.type === "improvement"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-blue-500/30 bg-blue-500/10"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles
                    className={`h-4 w-4 ${
                      insight.type === "strength"
                        ? "text-green-400"
                        : insight.type === "improvement"
                          ? "text-yellow-400"
                          : "text-blue-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium uppercase ${
                      insight.type === "strength"
                        ? "text-green-400"
                        : insight.type === "improvement"
                          ? "text-yellow-400"
                          : "text-blue-400"
                    }`}
                  >
                    {insight.type}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{insight.message}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Skill Gaps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
            <TrendingUp className="h-6 w-6 text-orange-400" />
            Skill Gaps to Close
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {learningPaths.skillGaps.map((gap, index) => (
              <SkillGapCard key={gap.skill} skillGap={gap} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Learning Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="mb-4 text-2xl font-bold text-white">Recommended Learning Path</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {learningPaths.learningModules.map((module, index) => (
              <LearningModuleCard key={module.id} module={module} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Weekly Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
        >
          <h2 className="mb-4 text-2xl font-bold text-white">This Week's AI-Generated Plan</h2>
          <div className="space-y-3">
            {learningPaths.weeklyPlan.map((item, index) => (
              <motion.div
                key={item.day}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/5 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <span className="text-sm font-bold text-blue-400">{item.day.slice(0, 3).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{item.task}</p>
                  <p className="text-sm text-zinc-400">{item.duration}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
