"use client"

import type { MouseEvent } from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { PromoraMark } from "@/components/landing/promora-mark"
import { ThemeToggle } from "@/components/landing/theme-toggle"

const links = [
  { label: "The Problem", href: "#problem" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "PromptIQ", href: "#promptiq" },
  { label: "Compare", href: "#compare" },
  { label: "Pricing", href: "#pricing" },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return
    e.preventDefault()
    const id = href.slice(1)
    const target = id === "top" ? document.body : document.getElementById(id)
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top, behavior: "smooth" })
    history.replaceState(null, "", href)
  }

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 pointer-events-none">
      <div className="mx-auto w-full max-w-7xl pointer-events-none">
        <div
          className={`
            pointer-events-auto mx-auto flex items-center justify-between gap-4
            h-16 pl-5 pr-2 rounded-full relative overflow-hidden
            bg-background/40 backdrop-blur-3xl backdrop-saturate-200
            border border-foreground/10
            ring-1 ring-inset ring-background/30
            shadow-[inset_0_1px_0_0_hsl(var(--background)/0.6),inset_0_-1px_0_0_hsl(var(--foreground)/0.04),0_8px_32px_-8px_hsl(240_18%_8%/0.18),0_24px_60px_-30px_hsl(var(--accent)/0.45)]
            transition-all duration-300
            before:content-[''] before:absolute before:inset-0 before:rounded-full
            before:bg-gradient-to-b before:from-background/40 before:to-transparent
            before:pointer-events-none
            ${scrolled ? "bg-background/55 border-foreground/[0.14]" : ""}
          `}
        >
          <nav className="flex items-center justify-between gap-6 w-full relative">
            <a
              href="#top"
              onClick={(e) => handleNavClick(e, "#top")}
              className="flex items-center gap-2.5 group shrink-0 h-full"
            >
              <PromoraMark size={28} className="text-foreground" />
              <span className="font-brand text-[18px] tracking-tight leading-none font-mono text-center font-medium">
                Promora
              </span>
            </a>

            <div className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => handleNavClick(e, l.href)}
                  className="relative px-3.5 py-2 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] transition-colors font-bold shadow-none"
                >
                  {l.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                size="sm"
                className="
                  font-mono text-[11px] uppercase tracking-[0.14em]
                  bg-foreground text-background hover:bg-accent hover:text-accent-foreground
                  rounded-full px-4 h-10
                  transition-colors
                "
              >
                Book Demo
                <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
