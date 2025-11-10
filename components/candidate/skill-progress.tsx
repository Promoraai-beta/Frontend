"use client"

import { motion } from "framer-motion"

interface Skill {
  name: string
  level: number
  assessments: number
}

interface SkillProgressProps {
  skills: Skill[]
}

export function SkillProgress({ skills }: SkillProgressProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-xl font-bold text-white">Skill Levels</h3>
      <div className="space-y-6">
        {skills.map((skill, index) => (
          <motion.div
            key={`${skill.name}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-white">{skill.name}</span>
              <span className="text-sm text-zinc-400">
                Level {skill.level} · {skill.assessments} assessments
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${skill.level}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
