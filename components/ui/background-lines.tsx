"use client"

import { cn } from "@/lib/utils"

interface BackgroundLinesProps {
  children?: React.ReactNode
  className?: string
  svgOptions?: { duration?: number }
}

const WavePaths = ({ duration, emeraldId, accentId }: { duration: number; emeraldId: string; accentId: string }) => (
  <>
    <path
      d="M0 20 Q 100 0, 200 20 T 400 20 T 600 20 T 800 20 T 1000 20"
      fill="none"
      stroke={`url(#${emeraldId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration}s ease-in-out infinite` }}
    />
    <path
      d="M0 80 Q 125 100, 250 80 T 500 80 T 750 80 T 1000 80"
      fill="none"
      stroke={`url(#${accentId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration + 2}s ease-in-out infinite`, animationDelay: "1s" }}
    />
    <path
      d="M0 140 Q 90 120, 180 140 T 360 140 T 540 140 T 720 140 T 900 140 T 1000 140"
      fill="none"
      stroke={`url(#${emeraldId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration - 1}s ease-in-out infinite`, animationDelay: "2s" }}
    />
    <path
      d="M0 200 Q 150 180, 300 200 T 600 200 T 900 200 T 1000 200"
      fill="none"
      stroke={`url(#${accentId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration + 3}s ease-in-out infinite`, animationDelay: "0.5s" }}
    />
    <path
      d="M0 260 Q 110 240, 220 260 T 440 260 T 660 260 T 880 260 T 1000 260"
      fill="none"
      stroke={`url(#${emeraldId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration}s ease-in-out infinite`, animationDelay: "3s" }}
    />
    <path
      d="M0 320 Q 140 300, 280 320 T 560 320 T 840 320 T 1000 320"
      fill="none"
      stroke={`url(#${accentId})`}
      strokeWidth="1"
      strokeLinecap="round"
      style={{ animation: `background-lines-wave ${duration - 2}s ease-in-out infinite`, animationDelay: "1.5s" }}
    />
  </>
)

/**
 * Background Lines - Aceternity UI style
 * SVG paths that animate in a wave pattern. Inspired by height.app
 * @see https://ui.aceternity.com/components/background-lines
 */
export function BackgroundLines({ children, className, svgOptions }: BackgroundLinesProps) {
  const duration = svgOptions?.duration ?? 10

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* Dark mode - white accent lines */}
      <svg
        className="absolute inset-0 h-full w-full hidden dark:block"
        viewBox="0 0 1000 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dark mode gradients */}
          <linearGradient id="bg-lines-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(52, 211, 153)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bg-lines-white" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(255, 255, 255)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(255, 255, 255)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="rgb(255, 255, 255)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <WavePaths duration={duration} emeraldId="bg-lines-emerald" accentId="bg-lines-white" />
      </svg>

      {/* Light mode - dark accent lines */}
      <svg
        className="absolute inset-0 h-full w-full block dark:hidden"
        viewBox="0 0 1000 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bg-lines-emerald-light" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(52, 211, 153)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bg-lines-dark-light" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(0, 0, 0)" stopOpacity="0" />
            <stop offset="50%" stopColor="rgb(0, 0, 0)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="rgb(0, 0, 0)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <WavePaths duration={duration} emeraldId="bg-lines-emerald-light" accentId="bg-lines-dark-light" />
      </svg>

      {/* Content layer */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
