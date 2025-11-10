"use client"

import { motion } from "framer-motion"
import { Code2, Users, GraduationCap, Building2 } from "lucide-react"

const useCases = [
  {
    icon: Code2,
    title: "For Developers",
    description:
      "Showcase your AI fluency and prompt engineering skills. Build a portfolio that proves you ship faster and smarter with AI.",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
  },
  {
    icon: Users,
    title: "For Recruiters",
    description:
      "Understand true AI competency beyond code output. Hire developers who leverage AI effectively without fear of plagiarism.",
    color: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/30",
  },
  {
    icon: GraduationCap,
    title: "For Educators",
    description:
      "Track how students use AI in assignments. Teach prompt hygiene and AI-assisted development as core skills.",
    color: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
  },
  {
    icon: Building2,
    title: "For Bootcamps",
    description:
      "Certify students based on their AI fluency process. Show employers graduates understand modern development workflows.",
    color: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
]

export function UseCasesSection() {
  return (
    <section className="relative bg-black py-24 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">Built For Everyone</h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-zinc-400">
            Whether you're hiring, learning, or showcasing your skills, PromoraAI adapts to your needs
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-zinc-700"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div className="relative">
                <div className="mb-4 inline-flex rounded-xl bg-white p-3">
                  <useCase.icon className="h-6 w-6 text-black" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{useCase.title}</h3>
                <p className="text-pretty text-sm text-zinc-400">{useCase.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
