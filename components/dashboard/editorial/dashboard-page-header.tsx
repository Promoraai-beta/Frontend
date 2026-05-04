"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DashboardPageHeader({
  eyebrow,
  title,
  italic,
  description,
  actions,
  actionsClassName,
}: {
  eyebrow: string
  title: string
  italic: string
  description?: ReactNode
  actions?: ReactNode
  /** Widen actions row (e.g. full-width search on mobile) */
  actionsClassName?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0 space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display text-3xl text-foreground md:text-[2.15rem] lg:text-4xl">
          {title} <span className="display-italic">{italic}</span>
        </h1>
        {description ? (
          <div className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className={cn("flex min-w-0 shrink-0 flex-wrap items-center gap-2", actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
