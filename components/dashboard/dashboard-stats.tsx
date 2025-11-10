"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CheckCircle2, Clock, Award, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"

interface DashboardStatsData {
  totalCandidates: number
  activeAssessments: number
  completedAssessments: number
  avgScore: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalCandidates: 0,
    activeAssessments: 0,
    completedAssessments: 0,
    avgScore: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        
        // Fetch sessions (already filtered by recruiter's company)
        const sessionsRes = await api.get('/api/sessions')
        const sessionsData = await sessionsRes.json()
        const sessions = sessionsData.success ? (sessionsData.data || []) : []

        // Fetch submissions to calculate average score
        const submissionsRes = await api.get('/api/submissions')
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        const submissions = submissionsRes.success ? (submissionsRes.data || []) : []
        
        // Filter submissions by recruiter's sessions
        const sessionIds = sessions.map(s => s.id)
        const recruiterSubmissions = submissions.filter((sub: any) => 
          sessionIds.includes(sub.sessionId || sub.session_id)
        )

        // Calculate statistics
        // Total Candidates: Unique candidates from sessions
        const uniqueCandidates = new Set(
          sessions
            .map(s => s.candidateId || s.candidate_id)
            .filter(id => id !== null && id !== undefined)
        )
        const totalCandidates = uniqueCandidates.size

        // Active Assessments: Sessions with status 'active'
        const activeAssessments = sessions.filter(s => s.status === 'active').length

        // Completed: Sessions with status 'submitted'
        const completedAssessments = sessions.filter(s => s.status === 'submitted').length

        // Average Score: Calculate from recruiter's submissions
        let avgScore = 0
        if (recruiterSubmissions.length > 0) {
          const totalScore = recruiterSubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0)
          avgScore = Math.round(totalScore / recruiterSubmissions.length)
        }

        setStats({
          totalCandidates,
          activeAssessments,
          completedAssessments,
          avgScore
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statsConfig = [
    {
      label: "Total Candidates",
      value: loading ? "..." : stats.totalCandidates.toString(),
      icon: Users,
      color: "from-blue-500/20 to-blue-600/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "Active Assessments",
      value: loading ? "..." : stats.activeAssessments.toString(),
      icon: Clock,
      color: "from-yellow-500/20 to-yellow-600/20",
      iconBg: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
    },
    {
      label: "Completed",
      value: loading ? "..." : stats.completedAssessments.toString(),
      icon: CheckCircle2,
      color: "from-green-500/20 to-green-600/20",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      label: "Avg. Score",
      value: loading ? "..." : `${stats.avgScore}%`,
      icon: Award,
      color: "from-purple-500/20 to-purple-600/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-950/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/50">
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100 ${stat.color}`}
            />
            <CardContent className="relative p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                  {loading ? (
                    <Loader2 className={`h-5 w-5 ${stat.iconColor} animate-spin`} />
                  ) : (
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  )}
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
