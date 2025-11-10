"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn } from "lucide-react"
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
          className={`rounded-full border border-zinc-800 px-6 py-3 transition-all duration-300 ${
            isScrolled ? "bg-black/80 backdrop-blur-lg shadow-lg" : "bg-black/60 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <Link href="/" className="text-xl font-bold text-white md:text-2xl">
              PromoraAI
            </Link>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-8 md:flex">
              <Link
                href="#demo"
                className="text-zinc-400 transition-colors hover:text-white"
                style={{ fontSize: "0.9375rem" }}
              >
                Demo
              </Link>
              <Link
                href="#features"
                className="text-zinc-400 transition-colors hover:text-white"
                style={{ fontSize: "0.9375rem" }}
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="text-zinc-400 transition-colors hover:text-white"
                style={{ fontSize: "0.9375rem" }}
              >
                Testimonials
              </Link>
              <Link
                href="#contact"
                className="text-zinc-400 transition-colors hover:text-white"
                style={{ fontSize: "0.9375rem" }}
              >
                Contact
              </Link>
            </div>

            {/* Login button with icon on right */}
            <div className="hidden items-center md:flex">
              <Button asChild variant="ghost" size="sm" className="gap-2 text-white hover:bg-zinc-900 hover:text-white">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white md:hidden">
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
            className="fixed left-1/2 top-20 z-40 w-[90%] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-black/95 p-6 backdrop-blur-lg md:hidden"
          >
            <div className="space-y-4">
              <Link
                href="#demo"
                className="block text-zinc-400 transition-colors hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Demo
              </Link>
              <Link
                href="#features"
                className="block text-zinc-400 transition-colors hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="block text-zinc-400 transition-colors hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Testimonials
              </Link>
              <Link
                href="#contact"
                className="block text-zinc-400 transition-colors hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="pt-4">
                <Button asChild className="w-full gap-2 bg-white text-black hover:bg-zinc-200">
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
