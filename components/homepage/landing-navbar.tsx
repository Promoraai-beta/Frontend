"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
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
          className="rounded-full px-6 py-3 transition-all duration-500"
          style={{
            border: isScrolled
              ? "1px solid rgba(139, 92, 246, 0.55)"
              : "1px solid rgba(139, 92, 246, 0.22)",
            background: isScrolled
              ? "rgba(9, 6, 18, 0.96)"
              : "rgba(12, 9, 20, 0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            boxShadow: isScrolled
              ? "0 0 0 1px rgba(139,92,246,0.18), 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.10)"
              : "0 0 20px rgba(139, 92, 246, 0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-xl font-bold md:text-2xl" style={{ color: "#F0EDF8" }}>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shadow-lg"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Promora<span style={{ color: "#8B5CF6" }}>AI</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-8 md:flex">
              {[
                { label: "Demo", href: "#demo" },
                { label: "Features", href: "#features" },
                { label: "Compare", href: "#compare" },
                { label: "Pricing", href: "/pricing" },
                { label: "FAQ", href: "#faq" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="relative text-sm font-medium transition-colors duration-150 group"
                  style={{ color: "#9B8CB8", fontSize: "0.9375rem" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F0EDF8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9B8CB8")}
                >
                  {link.label}
                  <span
                    className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-200 group-hover:w-full"
                    style={{ background: "#8B5CF6" }}
                  />
                </Link>
              ))}
            </div>

            {/* Right side CTAs */}
            <div className="hidden items-center gap-3 md:flex">
              <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-2"
                style={{ color: "#9B8CB8" }}
              >
                <Link href="/auth">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="gap-1.5 font-semibold"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 0 16px rgba(139,92,246,0.35)",
                }}
              >
                <Link href="/auth?tab=signup">Get Started →</Link>
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
              style={{ color: "#F0EDF8", background: "none", border: "none", cursor: "pointer" }}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="fixed left-1/2 top-20 z-40 w-[90%] -translate-x-1/2 rounded-2xl p-6 md:hidden"
            style={{
              background: "rgba(12, 9, 20, 0.96)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="space-y-4">
              {[
                { label: "Demo", href: "#demo" },
                { label: "Features", href: "#features" },
                { label: "Compare", href: "#compare" },
                { label: "Pricing", href: "/pricing" },
                { label: "FAQ", href: "#faq" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block font-medium transition-colors"
                  style={{ color: "#9B8CB8", fontSize: "1rem" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#F0EDF8")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#9B8CB8")}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
                <Button
                  asChild
                  className="flex-1 font-semibold"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff", border: "none" }}
                >
                  <Link href="/auth?tab=signup">Get Started →</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
