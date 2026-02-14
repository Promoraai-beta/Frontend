"use client"

import { motion } from "framer-motion"

interface Skill {
  name: string
  level: number
  assessments: number
}

interface SkillProgressProps {
  skills: (Skill | string)[]
}

export function SkillProgress({ skills }: SkillProgressProps) {
  const normalizedSkills = skills.map((s) =>
    typeof s === "string" ? { name: s, level: 50, assessments: 0 } : s
  )

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur-sm">
      <h3 className="mb-6 text-xl font-bold text-foreground">Skill Levels</h3>
      <div className="space-y-6">
        {normalizedSkills.map((skill, index) => (
          <motion.div
            key={`${skill.name}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-foreground">{skill.name}</span>
              {skill.assessments > 0 && (
                <span className="text-sm text-muted-foreground">
                  Level {skill.level} · {skill.assessments} assessments
                </span>
              )}
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
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
