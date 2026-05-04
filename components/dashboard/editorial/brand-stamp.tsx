"use client"

import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { promoraMarkMaskUrl } from "@/components/dashboard/editorial/promora-mark-mask"
import { promoraHalfSpiralMaskUrl } from "@/components/dashboard/editorial/promora-half-spiral-mask"

const noiseSvg =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

function stampStyleFromMask(maskUrl: string): CSSProperties {
  return {
    WebkitMaskImage: maskUrl,
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    WebkitMaskPosition: "center",
    maskImage: maskUrl,
    maskRepeat: "no-repeat",
    maskSize: "contain",
    maskPosition: "center",
    background: `${noiseSvg}, linear-gradient(135deg, hsl(var(--accent-glow)), hsl(var(--accent-deep)))`,
    backgroundBlendMode: "overlay",
  }
}

const stampStyleFull = stampStyleFromMask(promoraMarkMaskUrl)
const stampStyleHalfSpiral = stampStyleFromMask(promoraHalfSpiralMaskUrl)

/** Faded, textured half-spiral watermark (mask = first path only; noise + gradient). */
export function BrandStamp({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-44 w-44 shrink-0", className)} aria-hidden>
      <div className="absolute inset-0 opacity-[0.18] dark:opacity-[0.18]" style={stampStyleHalfSpiral} />
    </div>
  )
}

export function DashboardBrandStamp({
  variant = "full",
  className,
}: {
  variant?: "full" | "half" | "watermark"
  className?: string
}) {
  if (variant === "watermark") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 z-0 select-none md:-right-12 md:-top-14 lg:-right-6 lg:top-0",
          className
        )}
        aria-hidden
      >
        <div className="relative h-48 w-[6.25rem] overflow-hidden opacity-[0.11] dark:opacity-[0.14] sm:h-56 sm:w-[7rem] md:h-64 md:w-32 lg:h-[17rem] lg:w-[8.5rem]">
          <div
            className="absolute left-0 top-0 h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 lg:h-[17rem] lg:w-[17rem]"
            style={stampStyleFull}
          />
        </div>
      </div>
    )
  }

  if (variant === "half") {
    return (
      <div
        className={cn("relative h-44 w-[5.5rem] shrink-0 overflow-hidden md:w-[5.75rem]", className)}
        aria-hidden
      >
        <div className="absolute left-0 top-0 h-44 w-44 opacity-[0.18] dark:opacity-[0.22]" style={stampStyleFull} />
      </div>
    )
  }

  return (
    <div className={cn("relative h-44 w-44 shrink-0", className)}>
      <div className="absolute inset-0 opacity-[0.18] dark:opacity-[0.22]" style={stampStyleFull} />
    </div>
  )
}
