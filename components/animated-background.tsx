"use client"

import { useEffect, useRef } from "react"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    const orbs = [
      { x: 0.15, y: 0.2, radius: 500, color: "rgba(100, 100, 100, 0.15)", speed: 0.3 },
      { x: 0.85, y: 0.5, radius: 450, color: "rgba(150, 150, 150, 0.12)", speed: 0.5 },
      { x: 0.5, y: 0.75, radius: 400, color: "rgba(120, 120, 120, 0.1)", speed: 0.4 },
      { x: 0.3, y: 0.9, radius: 350, color: "rgba(80, 80, 80, 0.08)", speed: 0.6 },
    ]

    let animationFrame: number
    let time = 0

    const animate = () => {
      time += 0.005

      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      bgGradient.addColorStop(0, "#000000")
      bgGradient.addColorStop(0.5, "#0a0a0a")
      bgGradient.addColorStop(1, "#000000")
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      orbs.forEach((orb, index) => {
        const offsetX = Math.sin(time * orb.speed + index * 2) * 100
        const offsetY = Math.cos(time * orb.speed * 0.8 + index * 1.5) * 100
        const x = canvas.width * orb.x + offsetX
        const y = canvas.height * orb.y + offsetY

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.radius)
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(0.5, `rgba(50, 50, 50, ${Number.parseFloat(orb.color.split(",")[3]) * 0.3})`)
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })

      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
      ctx.lineWidth = 1
      const gridSize = 60

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          const pulse = Math.sin(time * 2 + x * 0.01 + y * 0.01) * 0.5 + 0.5
          ctx.globalAlpha = pulse * 0.3
          ctx.beginPath()
          ctx.arc(x, y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      const particleCount = 50
      for (let i = 0; i < particleCount; i++) {
        const px = (Math.sin(time * 0.5 + i * 0.5) * 0.5 + 0.5) * canvas.width
        const py = (time * 20 + i * 50) % canvas.height
        const size = Math.sin(time + i) * 1 + 1.5

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasSize)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none" style={{ background: "#000000" }} />
  )
}
