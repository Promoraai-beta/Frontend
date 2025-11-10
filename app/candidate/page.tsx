"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Loader2, User } from "lucide-react"
import { StatsOverview } from "@/components/candidate/stats-overview"
import { LastWorkDone } from "@/components/candidate/last-work-done"
import { SkillProgress } from "@/components/candidate/skill-progress"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import Image from "next/image"

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    totalPoints: 0,
    assessmentsCompleted: 0,
    promptIQScore: 0,
    level: "Beginner",
    practiceHours: 0,
    currentStreak: 0,
    rank: 0,
    totalUsers: 0
  })
  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/profiles/candidate")
      const data = await response.json()
      
      if (data.success && data.data) {
        setProfile({
          name: user?.name || data.data.name || "Candidate",
          title: data.data.title || "",
          targetRole: data.data.targetRole || "",
          avatar: data.data.avatar || null,
          skills: Array.isArray(data.data.skills) ? data.data.skills : []
        })
        
        setStats({
          totalPoints: data.data.totalPoints || 0,
          assessmentsCompleted: data.data.assessmentsCompleted || 0,
          promptIQScore: data.data.promptIQScore || 0,
          level: data.data.level || "Beginner",
          practiceHours: data.data.practiceHours || 0,
          currentStreak: data.data.currentStreak || 0,
          rank: data.data.rank || 0,
          totalUsers: data.data.totalUsers || 0
        })
      }
    } catch (err) {
      console.error("Error loading candidate profile:", err)
    } finally {
      setLoading(false)
    }
  }

  const lastWorkDone = [
    {
      id: "1",
      type: "assessment" as const,
      title: "React Advanced Patterns",
      language: "TypeScript",
      duration: "45 min",
      promptIQ: stats.promptIQScore || 0,
      timestamp: "2 hours ago",
      status: "completed" as const,
    },
    {
      id: "2",
      type: "practice" as const,
      title: "Node.js Microservices",
      language: "JavaScript",
      duration: "32 min",
      promptIQ: stats.promptIQScore || 0,
      timestamp: "1 day ago",
      status: "completed" as const,
    },
    {
      id: "3",
      type: "assessment" as const,
      title: "System Design Challenge",
      language: "Python",
      duration: "60 min",
      promptIQ: stats.promptIQScore || 0,
      timestamp: "2 days ago",
      status: "completed" as const,
    },
  ]

  if (loading) {
    return (
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />
        <CandidateNavbar />
        <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRole="candidate">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />

        <CandidateNavbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-6 rounded-xl border border-white/10 bg-gradient-to-r from-blue-950/20 to-purple-950/20 p-6 backdrop-blur-sm"
        >
          <div className="relative h-20 w-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/20 bg-zinc-900">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={profile?.name || "Profile"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Silently handle error and fallback to default icon
                  e.currentTarget.style.display = 'none'
                  // Update profile state to clear invalid avatar
                  setProfile(prev => prev ? { ...prev, avatar: null } : null)
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-10 w-10 text-zinc-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="mb-1 text-3xl font-bold text-white truncate">{profile?.name || user?.name || "Candidate"}</h1>
            <p className="mb-2 text-zinc-400 truncate">{profile?.title || "No title"}</p>
            <div className="flex items-center gap-4 text-sm">
              {profile?.targetRole && (
                <span className="text-zinc-500">Target: {profile.targetRole}</span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="mb-2 flex items-center gap-2 text-yellow-400">
              <Trophy className="h-5 w-5" />
              <span className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</span>
            </div>
            <p className="text-sm text-zinc-400">Total Points</p>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="mb-8">
          <StatsOverview stats={stats} />
        </div>

        {/* Last Work & Skills Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <LastWorkDone workItems={lastWorkDone} />
          <SkillProgress skills={profile?.skills || []} />
        </div>
      </main>
    </div>
    </ProtectedRoute>
  )
}
