"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CheckCircle2, Clock, TrendingUp, TrendingDown, Loader2, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"

interface DashboardStatsData {
  totalCandidates: number
  activeAssessments: number
  completedAssessments: number
  avgScore: number
}

// Arc gauge using the app's white/zinc color palette
function PromptIQGauge({ value, loading }: { value: number; loading: boolean }) {
  const pct = Math.min(value / 100, 1)
  const r = 38
  const cx = 50
  const cy = 50
  const startAngle = -215
  const sweepAngle = 250
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcX = (a: number) => cx + r * Math.cos(toRad(a))
  const arcY = (a: number) => cy + r * Math.sin(toRad(a))
  const endAngle = startAngle + sweepAngle * pct
  const largeArc = sweepAngle * pct > 180 ? 1 : 0
  const bgEnd = startAngle + sweepAngle
  const bgLarge = sweepAngle > 180 ? 1 : 0

  return (
    <svg width="100" height="72" viewBox="0 0 100 72">
      {/* Track */}
      <path
        d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${bgLarge} 1 ${arcX(bgEnd)} ${arcY(bgEnd)}`}
        fill="none" stroke="#27272a" strokeWidth="5" strokeLinecap="round"
      />
      {/* Value arc */}
      {!loading && pct > 0 && (
        <path
          d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endAngle)} ${arcY(endAngle)}`}
          fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"
        />
      )}
      {/* Score */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="white">
        {loading ? "—" : value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="7" fill="#71717a" fontWeight="500" letterSpacing="1">
        PROMPTIQ
      </text>
    </svg>
  )
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
        const sessionsRes = await api.get('/api/sessions')
        const sessionsData = await sessionsRes.json()
        const sessions = sessionsData.success ? (sessionsData.data || []) : []

        const submissionsRes = await api.get('/api/submissions')
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        const submissions = submissionsRes.success ? (submissionsRes.data || []) : []

        const sessionIds = sessions.map((s: any) => s.id)
        const recruiterSubmissions = submissions.filter((sub: any) =>
          sessionIds.includes(sub.sessionId || sub.session_id)
        )

        const uniqueCandidates = new Set(
          sessions.map((s: any) => s.candidateId || s.candidate_id).filter(Boolean)
        )
        const totalCandidates = uniqueCandidates.size
        const activeAssessments = sessions.filter((s: any) => s.status === 'active').length
        const completedAssessments = sessions.filter((s: any) => s.status === 'submitted').length

        let avgScore = 0
        if (recruiterSubmissions.length > 0) {
          const totalScore = recruiterSubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0)
          avgScore = Math.round(totalScore / recruiterSubmissions.length)
        }

        setStats({ totalCandidates, activeAssessments, completedAssessments, avgScore })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const narrowStats = [
    {
      label: "Candidates",
      value: stats.totalCandidates,
      trend: "+2",
      trendUp: true,
      sub: "this week",
      icon: Users,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Active",
      value: stats.activeAssessments,
      trend: "+1",
      trendUp: true,
      sub: "new today",
      icon: Clock,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Completed",
      value: stats.completedAssessments,
      trend: "+3",
      trendUp: true,
      sub: "this week",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* 3 narrow stat tiles */}
      {narrowStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          <Card className="group relative overflow-hidden border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-300 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-lg p-1.5 ${stat.iconBg}`}>
                  {loading
                    ? <Loader2 className={`h-4 w-4 ${stat.iconColor} animate-spin`} />
                    : <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  }
                </div>
                {!loading && (
                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    stat.trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {stat.trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-600">{stat.sub}</p>
              <p className="mt-2 text-xs font-medium text-zinc-400">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Wide PromptIQ tile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="col-span-2 lg:col-span-1"
      >
        <Card className="group relative overflow-hidden border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm hover:border-zinc-600 transition-all duration-300 h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-white/3 to-transparent pointer-events-none" />
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs font-medium text-zinc-400">Avg. PromptIQ</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">vs last month</p>
              </div>
              {/* Promora exclusive badge */}
              <div className="flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700/60 px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5 text-zinc-300" />
                <span className="text-[9px] font-semibold text-zinc-300 uppercase tracking-wide">Exclusive</span>
              </div>
            </div>

            <div className="flex items-center justify-center my-1">
              <PromptIQGauge value={stats.avgScore} loading={loading} />
            </div>

            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">+12%</span>
              <span className="text-xs text-zinc-500">this month</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
