"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn } from "lucide-react"

const PromoraLogo = () => (
  <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor">
    <polygon points="50,50 15,18 26,10"/>
    <polygon points="50,50 58,5 67,12"/>
    <polygon points="50,50 73,17 80,26"/>
    <polygon points="50,50 86,38 87,50"/>
    <polygon points="50,50 79,67 69,77"/>
    <polygon points="50,50 46,88 36,84"/>
    <polygon points="50,50 8,62 18,80"/>
  </svg>
)
import { ThemeToggle } from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed left-1/2 top-4 z-50 w-[90%] max-w-6xl -translate-x-1/2 md:w-[75%]"
      >
        <div
          className={`rounded-full border border-border px-6 py-3 transition-all duration-300 ${
            isScrolled
              ? "bg-background/80 shadow-xl backdrop-blur-xl"
              : "bg-background/60 backdrop-blur-xl"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <PromoraLogo />
              </div>
              PromoraAI
            </Link>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-8 md:flex">
              <Link
                href="#problem"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Problem
              </Link>
              <Link
                href="#promptiq"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                PromptIQ
              </Link>
              <Link
                href="#compare"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Compare
              </Link>
              <Link
                href="#vision"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Vision
              </Link>
              <Link
                href="#faq"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                FAQ
              </Link>
            </div>

            {/* Right side: theme toggle + login + book demo */}
            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
              <Button asChild variant="ghost" size="sm" className="gap-2 text-foreground hover:bg-muted hover:text-foreground">
                <Link href="/auth">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="https://calendly.com/promoraai05/30min" target="_blank" rel="noopener noreferrer">
                  Book a demo
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground md:hidden">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-20 z-40 w-[90%] -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-6 backdrop-blur-lg md:hidden"
          >
            <div className="space-y-4">
              <Link
                href="#problem"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Problem
              </Link>
              <Link
                href="#promptiq"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                PromptIQ
              </Link>
              <Link
                href="#compare"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Compare
              </Link>
              <Link
                href="#vision"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Vision
              </Link>
              <Link
                href="#faq"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex gap-2 pt-4">
                <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link href="/auth">
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="https://calendly.com/promoraai05/30min" target="_blank" rel="noopener noreferrer">Book a demo</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
