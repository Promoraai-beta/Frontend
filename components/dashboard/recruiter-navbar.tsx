"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, X, Bell, User } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { NotificationsDrawer } from "@/components/dashboard/notifications-drawer"
import { ThemeToggle } from "@/components/theme-toggle"
import { api } from "@/lib/api"
import Image from "next/image"
import { PromoraMark } from "@/components/landing/promora-mark"

interface RecruiterNavLink {
  label: string
  href: string
  match: (p: string) => boolean
  live?: boolean
}

const NAV_LINKS: RecruiterNavLink[] = [
  { label: "Dashboard", href: "/dashboard", match: (p: string) => p === "/dashboard" },
  {
    label: "Positions",
    href: "/dashboard/positions",
    match: (p: string) => p.startsWith("/dashboard/positions"),
  },
  {
    label: "Candidates",
    href: "/dashboard/candidates",
    match: (p: string) => p.startsWith("/dashboard/candidates"),
  },
  { label: "Live", href: "/dashboard/live", match: (p: string) => p === "/dashboard/live", live: true },
  {
    label: "Reports",
    href: "/dashboard/reports",
    match: (p: string) => p.startsWith("/dashboard/reports"),
  },
]

export function RecruiterNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [recruiterAvatar, setRecruiterAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role !== "recruiter") {
      console.warn(`[SECURITY] Non-recruiter user (${user.role}) attempted to access recruiter navbar`)
      if (user.role === "candidate") router.push("/candidate/assessments")
      else if (user.role === "admin") router.push("/admin/dashboard")
      else router.push("/auth")
    }
  }, [user, router])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    async function loadRecruiterAvatar() {
      if (user && user.role === "recruiter") {
        try {
          const response = await api.get("/api/profiles/recruiter")
          const data = await response.json()
          if (data.success && data.data?.avatar) setRecruiterAvatar(data.data.avatar)
        } catch (error) {
          console.error("Error loading recruiter avatar:", error)
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

  const shellClass = `
    rounded-full border border-foreground/10
    bg-background/40 backdrop-blur-3xl backdrop-saturate-200
    ring-1 ring-inset ring-background/30
    shadow-[inset_0_1px_0_0_hsl(var(--background)/0.6),inset_0_-1px_0_0_hsl(var(--foreground)/0.04),0_8px_32px_-8px_hsl(240_18%_8%/0.14),0_24px_60px_-30px_hsl(var(--accent)/0.35)]
    transition-all duration-300
    before:content-[''] before:absolute before:inset-0 before:rounded-full
    before:bg-gradient-to-b before:from-background/40 before:to-transparent
    before:pointer-events-none
    ${isScrolled ? "bg-background/55 border-foreground/[0.14]" : ""}
  `

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 pt-4 px-4">
        <motion.nav
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-auto relative mx-auto w-full max-w-[90rem]"
        >
          <div className={`relative overflow-hidden px-3 py-2 md:px-5 md:py-2.5 ${shellClass}`}>
            <div className="relative flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex shrink-0 items-center gap-2.5 text-foreground"
              >
                <PromoraMark size={26} className="text-foreground" />
                <span className="font-brand text-[17px] font-medium leading-none tracking-tight">Promora</span>
              </button>

              <div className="hidden items-center gap-2 md:flex lg:gap-2.5">
                {NAV_LINKS.map(({ label, href, match, live }) => {
                  const active = match(pathname)
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => router.push(href)}
                      className={`
                        relative flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors md:px-4
                        ${active ? "bg-accent-soft/70 text-accent" : "text-foreground/75 hover:bg-foreground/[0.06] hover:text-foreground"}
                      `}
                    >
                      {live && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_10px_hsl(142_71%_45%/0.45)] animate-pulse dark:bg-emerald-400" />
                      )}
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="hidden items-center gap-1 md:flex">
                <ThemeToggle variant="ghost" size="icon" className="shrink-0 rounded-full" />
                <button
                  type="button"
                  onClick={() => setShowNotifications(true)}
                  className="relative rounded-full p-2 text-foreground transition-colors hover:bg-foreground/[0.06]"
                  aria-label="Notifications"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute right-1 top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/profile")}
                  className="relative h-9 w-9 overflow-hidden rounded-full border border-border bg-muted transition-colors hover:border-accent/40"
                  title={user?.name || "Profile"}
                >
                  {recruiterAvatar ? (
                    <Image src={recruiterAvatar} alt={user?.name || "Profile"} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-[18px] w-[18px] text-muted-foreground" />
                    </div>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="ml-0.5 gap-1.5 rounded-full text-sm font-medium tracking-normal text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-full p-2 text-foreground hover:bg-foreground/[0.06] md:hidden"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </motion.nav>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-4 right-4 top-[4.5rem] z-40 rounded-2xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1">
              {NAV_LINKS.map(({ label, href, live }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    router.push(href)
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted"
                >
                  {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-2 border-t border-border pt-4">
                <ThemeToggle variant="ghost" size="icon" className="rounded-full" />
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm text-muted-foreground">{user?.name}</p>
                <Button onClick={handleLogout} variant="outline" className="w-full gap-2 rounded-full text-sm font-medium tracking-normal">
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
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
