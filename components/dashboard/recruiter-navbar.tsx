"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Sparkles, Menu, X, Bell, User } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { NotificationsDrawer } from "@/components/dashboard/notifications-drawer"
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
          className={`rounded-full border border-zinc-800 px-6 py-3 transition-all duration-300 ${
            isScrolled ? "bg-black/80 backdrop-blur-lg shadow-lg" : "bg-black/60 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-xl font-bold text-white md:text-2xl"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white via-zinc-200 to-zinc-400 shadow-lg shadow-white/10">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              PromoraAI
            </button>

            {/* Center navigation - Desktop only */}
            <div className="hidden items-center gap-8 md:flex">
              <button
                onClick={() => router.push("/dashboard")}
                className={`text-sm transition-colors ${
                  pathname === "/dashboard" ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/dashboard/candidates")}
                className={`text-sm transition-colors ${
                  pathname.startsWith("/dashboard/candidates") ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Candidates
              </button>
            </div>

            {/* User info and logout on right */}
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative rounded-full p-2 text-white transition-colors hover:bg-zinc-900"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
              </button>
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600"
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
              <button
                onClick={() => {
                  router.push("/dashboard")
                  setIsMobileMenuOpen(false)
                }}
                className={`block w-full text-left transition-colors ${
                  pathname === "/dashboard" ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  router.push("/dashboard/candidates")
                  setIsMobileMenuOpen(false)
                }}
                className={`block w-full text-left transition-colors ${
                  pathname.startsWith("/dashboard/candidates") ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Candidates
              </button>
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

      <NotificationsDrawer isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  )
}
