"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Sparkles, Menu, X, Bell, User } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { NotificationsDrawer } from "@/components/dashboard/notifications-drawer"
import { ThemeToggle } from "@/components/theme-toggle"
import { api } from "@/lib/api"
import Image from "next/image"

export function RecruiterNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [recruiterAvatar, setRecruiterAvatar] = useState<string | null>(null)
  const [loadingAvatar, setLoadingAvatar] = useState(true)

  // STRICT: Redirect if user is not a recruiter
  useEffect(() => {
    if (user && user.role !== 'recruiter') {
      console.warn(`[SECURITY] Non-recruiter user (${user.role}) attempted to access recruiter navbar`)
      if (user.role === 'candidate') {
        router.push('/candidate/assessments')
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

  // Load recruiter profile avatar
  useEffect(() => {
    async function loadRecruiterAvatar() {
      if (user && user.role === "recruiter") {
        try {
          setLoadingAvatar(true)
          const response = await api.get("/api/profiles/recruiter")
          const data = await response.json()
          
          if (data.success && data.data?.avatar) {
            setRecruiterAvatar(data.data.avatar)
          }
        } catch (error) {
          console.error("Error loading recruiter avatar:", error)
        } finally {
          setLoadingAvatar(false)
        }
      }
    }

    loadRecruiterAvatar()
  }, [user])

  const handleLogout = () => {
    logout()
    setUser(null)
    router.push("/")
  }

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
            isScrolled ? "bg-background/80 backdrop-blur-lg shadow-lg" : "bg-background/60 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-xl font-bold text-foreground md:text-2xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              PromoraAI
            </button>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-8 md:flex">
              {[
                { label: "Dashboard",  href: "/dashboard",            match: (p: string) => p === "/dashboard" },
                { label: "Positions",  href: "/dashboard/positions",  match: (p: string) => p.startsWith("/dashboard/positions") },
                { label: "Candidates", href: "/dashboard/candidates", match: (p: string) => p.startsWith("/dashboard/candidates") },
                { label: "Live",       href: "/dashboard/live",       match: (p: string) => p === "/dashboard/live" },
                { label: "Reports",    href: "/dashboard/reports",    match: (p: string) => p.startsWith("/dashboard/reports") },
              ].map(({ label, href, match }) => {
                const active = match(pathname)
                return (
                  <button
                    key={label}
                    onClick={() => router.push(href)}
                    className={`relative text-sm transition-colors pb-0.5 flex items-center gap-1.5 ${
                      active ? "text-white font-medium" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {label === "Live" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    )}
                    {label}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-white" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* User info and logout on right */}
            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
              <button
                onClick={() => setShowNotifications(true)}
                className="relative rounded-full p-2 text-foreground transition-colors hover:bg-muted"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
              </button>
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-border bg-muted transition-colors hover:border-muted-foreground/50"
                title={user?.name || "Profile"}
              >
                {recruiterAvatar ? (
                  <Image
                    src={recruiterAvatar}
                    alt={user?.name || "Profile"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="gap-2 text-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Logout
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
              {[
                { label: "Dashboard",  href: "/dashboard" },
                { label: "Positions",  href: "/dashboard/positions" },
                { label: "Candidates", href: "/dashboard/candidates" },
                { label: "Live",       href: "/dashboard/live" },
                { label: "Reports",    href: "/dashboard/reports" },
              ].map(({ label, href }) => (
                <button
                  key={label}
                  onClick={() => { router.push(href); setIsMobileMenuOpen(false) }}
                  className="block w-full text-left text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {label}
                </button>
              ))}
              <div className="flex gap-2 pt-2">
                <ThemeToggle variant="ghost" size="icon" className="shrink-0" />
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm text-muted-foreground">{user?.name}</p>
                <Button onClick={handleLogout} className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationsDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  )
}
