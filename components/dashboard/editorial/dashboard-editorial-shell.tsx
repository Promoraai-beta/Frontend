"use client"

import type { ReactNode } from "react"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { motion } from "framer-motion"

/**
 * Matches `RecruiterNavbar`: fixed strip uses `px-4`, bar `max-w-[90rem]`, pill content `px-3 md:px-5`.
 * Use these anywhere recruiter dashboard body should line up with logo ↔ Log out.
 */
export const RECRUITER_DASH_MAIN_OUTER =
  "relative z-[1] w-full px-4 pb-32 pt-24 md:pt-28 lg:pt-32"

export const RECRUITER_DASH_MAIN_INNER = "mx-auto w-full max-w-[90rem] px-3 md:px-5"

export function DashboardEditorialShell({
  children,
  animateEnter = true,
  contentClassName,
}: {
  children: ReactNode
  animateEnter?: boolean
  /** e.g. space-y-6 when parent controls rhythm */
  contentClassName?: string
}) {
  const cls = contentClassName ?? "space-y-8"
  const inner = animateEnter ? (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cls}
    >
      {children}
    </motion.div>
  ) : (
    <div className={cls}>{children}</div>
  )

  return (
    <div className="recruiter-shell-bg relative min-h-screen text-foreground">
      <RecruiterNavbar />
      <main className={RECRUITER_DASH_MAIN_OUTER}>
        <div className={RECRUITER_DASH_MAIN_INNER}>{inner}</div>
      </main>
    </div>
  )
}
