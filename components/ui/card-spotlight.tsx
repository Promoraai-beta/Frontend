"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface CardSpotlightProps {
  children: React.ReactNode
  className?: string
  radius?: number
  color?: string
}

export function CardSpotlight({ children, className, radius = 350, color = "rgba(52, 211, 153, 0.15)" }: CardSpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setOpacity(1)
  }

  const handleMouseLeave = () => setOpacity(0)

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("group relative overflow-hidden rounded-2xl", className)}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          opacity,
          transition: "opacity 200ms ease",
          background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${color}, transparent 40%)`,
        }}
      />
      {children}
    </div>
  )
}
