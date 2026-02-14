"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn, Sparkles } from "lucide-react"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              PromoraAI
            </Link>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-8 md:flex">
              <Link
                href="#demo"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Demo
              </Link>
              <Link
                href="#features"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Features
              </Link>
              <Link
                href="#compare"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Compare
              </Link>
              <Link
                href="/pricing"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                Pricing
              </Link>
              <Link
                href="#faq"
                className="text-muted-foreground transition-colors hover:text-foreground"
                style={{ fontSize: "0.9375rem" }}
              >
                FAQ
              </Link>
            </div>

            {/* Login button with icon on right */}
            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
              <Button asChild variant="ghost" size="sm" className="gap-2 text-foreground hover:bg-muted hover:text-foreground">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Login
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
                href="#demo"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Demo
              </Link>
              <Link
                href="#features"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#compare"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Compare
              </Link>
              <Link
                href="/pricing"
                className="block text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
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
                <Button asChild className="flex-1 gap-2">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
