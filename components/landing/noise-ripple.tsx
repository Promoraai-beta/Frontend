"use client"

import { useEffect, useRef } from "react"

/**
 * Auto-drifting noise particle field.
 */
export function NoiseRipple({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const getColors = () => {
      const root = getComputedStyle(document.documentElement)
      return {
        accent: root.getPropertyValue("--accent").trim() || "248 53% 58%",
        fg: root.getPropertyValue("--foreground").trim() || "240 18% 8%",
      }
    }
    let { accent, fg } = getColors()

    let ox = new Float32Array(0)
    let oy = new Float32Array(0)
    let ph = new Float32Array(0)
    let sp = new Float32Array(0)
    let pa = new Float32Array(0)
    let psz = new Float32Array(0)
    let phot = new Uint8Array(0)

    const buildField = () => {
      const count = Math.round((width * height) / 1400)
      ox = new Float32Array(count)
      oy = new Float32Array(count)
      ph = new Float32Array(count)
      sp = new Float32Array(count)
      pa = new Float32Array(count)
      psz = new Float32Array(count)
      phot = new Uint8Array(count)
      for (let i = 0; i < count; i++) {
        ox[i] = Math.random() * width
        oy[i] = Math.random() * height
        ph[i] = Math.random() * Math.PI * 2
        sp[i] = 0.6 + Math.random() * 0.8
        pa[i] = 0.18 + Math.random() * 0.35
        psz[i] = 1 + Math.random() * 1.6
        phot[i] = Math.random() < 0.18 ? 1 : 0
      }
    }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildField()
    }
    resize()
    window.addEventListener("resize", resize)

    const themeObserver = new MutationObserver(() => {
      ;({ accent, fg } = getColors())
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    const AMPL = 22
    const SPEED = 0.00045

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height)

      const baseFg = `hsl(${fg})`
      const baseAccent = `hsl(${accent})`

      const count = ox.length
      ctx.fillStyle = baseFg
      for (let i = 0; i < count; i++) {
        if (phot[i]) continue
        const t = now * SPEED * sp[i] + ph[i]
        const x = ox[i] + Math.cos(t) * AMPL
        const y = oy[i] + Math.sin(t * 1.3) * AMPL * 0.7
        const a = pa[i] * (0.7 + 0.3 * Math.sin(t * 2))
        ctx.globalAlpha = a
        const s = psz[i]
        ctx.fillRect(x, y, s, s)
      }
      ctx.fillStyle = baseAccent
      for (let i = 0; i < count; i++) {
        if (!phot[i]) continue
        const t = now * SPEED * sp[i] + ph[i]
        const x = ox[i] + Math.cos(t) * AMPL
        const y = oy[i] + Math.sin(t * 1.3) * AMPL * 0.7
        const a = (pa[i] + 0.15) * (0.7 + 0.3 * Math.sin(t * 2))
        ctx.globalAlpha = a > 1 ? 1 : a
        const s = psz[i] + 0.6
        ctx.fillRect(x, y, s, s)
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener("resize", resize)
      themeObserver.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}
