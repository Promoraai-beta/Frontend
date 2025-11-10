"use client"

import { motion } from "framer-motion"

import { logger } from "@/lib/logger"

export function BackgroundPaths() {
  logger.log("[v0] BackgroundPaths rendering with new design")

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-1/2 right-1/4 w-80 h-80 bg-white/15 rounded-full blur-3xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-white/12 rounded-full blur-3xl"
        animate={{
          x: [0, 60, 0],
          y: [0, -60, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="50%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {[...Array(5)].map((_, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0"
            y1={`${20 + i * 20}%`}
            x2="100%"
            y2={`${20 + i * 20}%`}
            stroke="url(#lineGradient)"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}

        {[...Array(5)].map((_, i) => (
          <motion.line
            key={`v-${i}`}
            x1={`${20 + i * 20}%`}
            y1="0"
            x2={`${20 + i * 20}%`}
            y2="100%"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: i * 0.7,
            }}
          />
        ))}
      </svg>
    </div>
  )
}
