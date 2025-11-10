"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X, User, Sparkles } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api"
import Image from "next/image"

export function CandidateNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [candidateAvatar, setCandidateAvatar] = useState<string | null>(null)

  // STRICT: Redirect if user is not a candidate
  useEffect(() => {
    if (user && user.role !== 'candidate') {
      console.warn(`[SECURITY] Non-candidate user (${user.role}) attempted to access candidate navbar`)
      if (user.role === 'recruiter') {
        router.push('/dashboard')
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, router])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Load candidate profile avatar
  useEffect(() => {
    async function loadCandidateAvatar() {
      if (user && user.role === "candidate") {
        try {
          const response = await api.get("/api/profiles/candidate")
          const data = await response.json()
          
          if (data.success && data.data?.avatar) {
            // Validate avatar URL before setting
            const avatarUrl = data.data.avatar
            // Only set if URL is valid (starts with http/https)
            if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
              setCandidateAvatar(avatarUrl)
            }
          }
        } catch (error) {
          // Silently handle error - avatar is optional
        }
      }
    }

    loadCandidateAvatar()
  }, [user])

  const handleLogout = () => {
    logout()
    setUser(null)
    router.push("/")
  }

  const navLinks = [
    { href: "/candidate", label: "Dashboard" },
    // Practice feature hidden - will be available in future releases
    // { href: "/candidate/practice", label: "Practice" },
    { href: "/candidate/assessments", label: "My Assessments" },
    { href: "/candidate/reports", label: "Reports" },
    { href: "/candidate/profile", label: "Profile" },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed left-1/2 top-4 z-50 w-[95%] max-w-7xl -translate-x-1/2 lg:w-[85%]"
      >
        <div
          className={`rounded-full border border-zinc-800 px-6 py-3 transition-all duration-300 ${
            isScrolled ? "bg-black/80 backdrop-blur-lg shadow-lg" : "bg-black/60 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <button
              onClick={() => router.push("/candidate")}
              className="flex items-center gap-2 text-xl font-bold text-white md:text-2xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white via-zinc-200 to-zinc-400 shadow-lg shadow-white/10">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              PromoraAI
            </button>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-6 lg:flex xl:gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`text-sm transition-colors ${
                    pathname === link.href ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* User info and logout on right */}
            <div className="hidden items-center gap-3 lg:flex">
              <button
                onClick={() => router.push("/candidate/profile")}
                className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
                title={user?.name || "Profile"}
              >
                {candidateAvatar ? (
                  <img
                    src={candidateAvatar}
                    alt={user?.name || "Profile"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Silently handle error and fallback to default icon
                      e.currentTarget.style.display = 'none'
                      setCandidateAvatar(null) // Clear invalid avatar to prevent retries
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                )}
              </button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="gap-2 text-white hover:bg-zinc-900 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white lg:hidden">
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
            className="fixed left-1/2 top-20 z-40 w-[95%] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-black/95 p-6 backdrop-blur-lg lg:hidden"
          >
            <div className="space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`block w-full text-left transition-colors ${
                    pathname === link.href ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-sm text-zinc-400">{user?.name}</p>
                <Button onClick={handleLogout} className="w-full gap-2 bg-white text-black hover:bg-zinc-200">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
