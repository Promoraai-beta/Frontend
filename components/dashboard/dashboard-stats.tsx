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
    <svg width="100" height="72" viewBox="0 0 100 72" className="text-foreground">
      <path
        d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${bgLarge} 1 ${arcX(bgEnd)} ${arcY(bgEnd)}`}
        fill="none"
        stroke="hsl(var(--hairline))"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {!loading && pct > 0 && (
        <path
          d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endAngle)} ${arcY(endAngle)}`}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="600" fill="hsl(var(--foreground))" className="font-serif">
        {loading ? "—" : value}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize="7"
        fill="hsl(var(--muted-foreground))"
        fontWeight="600"
        letterSpacing="0.12em"
        className="font-mono uppercase"
      >
        PromptIQ
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
      iconColor: "text-accent",
      iconBg: "bg-accent-soft/70",
    },
    {
      label: "Active",
      value: stats.activeAssessments,
      trend: "+1",
      trendUp: true,
      sub: "new today",
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Completed",
      value: stats.completedAssessments,
      trend: "+3",
      trendUp: true,
      sub: "this week",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
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
          <Card className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-none transition-colors duration-300 hover:border-accent/25">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className={`rounded-xl p-2 ${stat.iconBg}`}>
                  {loading ? (
                    <Loader2 className={`h-4 w-4 ${stat.iconColor} animate-spin`} />
                  ) : (
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  )}
                </div>
                {!loading && (
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${
                      stat.trendUp
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {stat.trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="font-serif text-3xl font-medium tabular-nums tracking-tight text-foreground">
                {loading ? "—" : stat.value}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{stat.sub}</p>
              <p className="mt-3 text-xs font-medium text-muted-foreground">{stat.label}</p>
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
        <Card className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-none transition-colors duration-300 hover:border-accent/30">
          <CardContent className="relative p-5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg. PromptIQ</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/80">
                  vs last month
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-accent-soft/50 px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5 text-accent" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent">Exclusive</span>
              </div>
            </div>

            <div className="my-1 flex items-center justify-center">
              <PromptIQGauge value={stats.avgScore} loading={loading} />
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+12%</span>
              <span className="text-xs text-muted-foreground">this month</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
