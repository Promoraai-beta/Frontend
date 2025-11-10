"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Trophy, Loader2, User, MapPin, Briefcase, Target, Award, Heart } from "lucide-react"
import { StatsOverview } from "@/components/candidate/stats-overview"
import { LastWorkDone } from "@/components/candidate/last-work-done"
import { SkillProgress } from "@/components/candidate/skill-progress"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent } from "@/components/ui/card"

export default function CandidateDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [imageError, setImageError] = useState(false)
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

  // Reset image error when avatar changes
  useEffect(() => {
    setImageError(false)
  }, [profile?.avatar])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/profiles/candidate")
      const data = await response.json()
      
      if (data.success && data.data) {
        // Add cache buster to ensure fresh image loads
        const avatarUrl = data.data.avatar || null
        
        // Debug logging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log('📸 Avatar URL from API:', avatarUrl)
        }
        
        setProfile({
          name: user?.name || data.data.name || "Candidate",
          title: data.data.title || "",
          targetRole: data.data.targetRole || "",
          location: data.data.location || "",
          bio: data.data.bio || "",
          avatar: avatarUrl ? `${avatarUrl}?t=${Date.now()}` : null,
          skills: Array.isArray(data.data.skills) ? data.data.skills : [],
          interests: Array.isArray(data.data.interests) ? data.data.interests : []
        })
        setImageError(false) // Reset error state when loading new avatar
        
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
        {/* Enhanced Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-zinc-800/50 bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-zinc-900/50" />
            <CardContent className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Profile Avatar */}
                <div className="relative group flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-zinc-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-zinc-700/50 bg-zinc-900 overflow-hidden shadow-2xl">
                    {profile?.avatar && !imageError ? (
              <img
                src={profile.avatar}
                alt={profile?.name || "Profile"}
                className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                onError={(e) => {
                          console.error('❌ Image failed to load:', profile.avatar)
                          console.error('Image error event:', e)
                          console.error('Image element:', e.target)
                          // Try to fetch the image directly to see the actual error
                          if (profile.avatar) {
                            fetch(profile.avatar, { method: 'HEAD' })
                              .then(res => {
                                console.error('Image fetch status:', res.status, res.statusText)
                                console.error('Image fetch headers:', Object.fromEntries(res.headers.entries()))
                              })
                              .catch(err => {
                                console.error('Image fetch error:', err)
                              })
                          }
                          setImageError(true)
                        }}
                        onLoad={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('✅ Image loaded successfully:', profile.avatar)
                          }
                          setImageError(false)
                }}
              />
            ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <User className="h-12 w-12 md:h-16 md:w-16 text-zinc-500" />
              </div>
            )}
          </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0 space-y-3">
          <div className="flex-1 min-w-0">
                    <h1 className="mb-2 text-3xl md:text-4xl font-bold text-white truncate">
                      {profile?.name || user?.name || "Candidate"}
                    </h1>
                    
                    {/* Title and Location */}
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      {profile?.title && (
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Briefcase className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm md:text-base">{profile.title}</span>
                        </div>
                      )}
                      {profile?.location && (
                        <div className="flex items-center gap-2 text-zinc-300">
                          <MapPin className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm md:text-base">{profile.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Target Role */}
              {profile?.targetRole && (
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-purple-300">Target: {profile.targetRole}</span>
                      </div>
                    )}

                    {/* Bio */}
                    {profile?.bio && (
                      <p className="text-sm md:text-base text-zinc-300 leading-relaxed line-clamp-2">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  {/* Skills and Interests Tags */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {profile?.skills && profile.skills.length > 0 && (
                      <>
                        {profile.skills.slice(0, 5).map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-lg text-xs md:text-sm flex items-center gap-1 border border-blue-500/30"
                          >
                            <Award className="h-3 w-3" />
                            {skill}
                          </span>
                        ))}
                        {profile.skills.length > 5 && (
                          <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs md:text-sm border border-zinc-700">
                            +{profile.skills.length - 5} more
                          </span>
                        )}
                      </>
                    )}
                    {profile?.interests && profile.interests.length > 0 && (
                      <>
                        {profile.interests.slice(0, 3).map((interest: string, index: number) => (
                          <span
                            key={`interest-${index}`}
                            className="px-3 py-1 bg-pink-500/10 text-pink-300 rounded-lg text-xs md:text-sm flex items-center gap-1 border border-pink-500/30"
                          >
                            <Heart className="h-3 w-3" />
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 3 && (
                          <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs md:text-sm border border-zinc-700">
                            +{profile.interests.length - 3} more
                          </span>
                        )}
                      </>
              )}
            </div>
          </div>

                {/* Points Display */}
                <div className="text-center md:text-right flex-shrink-0">
                  <div className="mb-2 flex items-center justify-center md:justify-end gap-2 text-yellow-400">
                    <Trophy className="h-6 w-6 md:h-7 md:w-7" />
                    <span className="text-3xl md:text-4xl font-bold">{stats.totalPoints.toLocaleString()}</span>
            </div>
            <p className="text-sm text-zinc-400">Total Points</p>
                  {stats.level && (
                    <div className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-lg text-xs md:text-sm border border-emerald-500/30 inline-block">
                      {stats.level}
                    </div>
                  )}
                </div>
          </div>
            </CardContent>
          </Card>
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
