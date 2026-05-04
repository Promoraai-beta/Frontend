import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Matches `Nav` sticky strip: `px-4` */
export const landingNavOuterClass = "w-full px-4"

/** Matches `Nav` bar: `max-w-7xl` + pill insets `pl-5 pr-2` (logo → Book Demo) */
export const landingNavInnerClass = "mx-auto w-full max-w-7xl pl-5 pr-2"

export function LandingPageSection({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <div className={cn(landingNavOuterClass, className)}>
      <div className={cn(landingNavInnerClass, innerClassName)}>{children}</div>
    </div>
  )
}
