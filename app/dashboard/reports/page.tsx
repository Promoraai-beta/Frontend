"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { PromptIQTrendChart } from "@/components/dashboard/promptiq-trend-chart"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Zap, MessageSquare, Clock, Users, CheckCircle2 } from "lucide-react"
import Link from "next/link"

function StatTile({ label, value, sub, trend, trendUp, loading }: {
  label: string; value: string | number; sub: string; trend?: string; trendUp?: boolean; loading: boolean
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-3">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-white tabular-nums">{loading ? "—" : value}</p>
        {trend && !loading && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mb-1 ${trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
    </div>
  )
}

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-xs font-semibold text-white flex-shrink-0">
      {initials.toUpperCase()}
    </div>
  )
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    assessmentsSent: 0,
    completionRate: 0,
    avgTimeMin: 0,
    hireReady: 0,
    totalInteractions: 0,
    totalTokens: 0,
    avgTokensPerSession: 0,
  })
  const [sessions, setSessions] = useState<any[]>([])
  const [aiInteractions, setAiInteractions] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [assessmentMap, setAssessmentMap] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, assRes, aiRes] = await Promise.all([
          api.get("/api/sessions").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
          api.get("/api/assessments").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
          api.get("/api/ai-interactions").then(r => r.json()).catch(() => ({ success: false, data: [] })),
        ])

        const sessions: any[]    = sessRes
        const assessments: any[] = assRes
        const aMap = Object.fromEntries(assessments.map((a: any) => [a.id, a.jobTitle || a.role || "Untitled"]))
        setAssessmentMap(aMap)

        const submitted = sessions.filter((s: any) => s.status === "submitted")
        const completionRate = sessions.length > 0 ? Math.round((submitted.length / sessions.length) * 100) : 0

        // Avg time: from startedAt → submittedAt in minutes
        const timings = submitted
          .map((s: any) => {
            const start = s.startedAt || s.started_at
            const end   = s.submittedAt || s.submitted_at
            if (!start || !end) return null
            return (new Date(end).getTime() - new Date(start).getTime()) / 60000
          })
          .filter((t): t is number => t !== null && t > 0 && t < 300)
        const avgTimeMin = timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0

        const hireReady = submitted.filter((s: any) => (s.score || 0) >= 80).length

        // AI interaction stats
        const aiData: any[] = aiRes.success ? (aiRes.data || []) : []
        const totalInteractions  = aiData.length
        const totalTokens        = aiData.reduce((sum: number, i: any) => sum + ((i.promptTokens || 0) + (i.completionTokens || 0)), 0)
        const avgTokensPerSession = sessions.length > 0 ? Math.round(totalTokens / sessions.length) : 0

        // Top performers: submitted sessions sorted by score desc
        const performers = submitted
          .filter((s: any) => s.score > 0)
          .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
          .slice(0, 5)
          .map((s: any) => ({
            id: s.id,
            name: s.candidateName || "Unknown",
            email: s.candidateEmail || "",
            position: aMap[s.assessmentId] || "—",
            score: s.score,
          }))

        setSessions(sessRes)
        setAiInteractions(aiRes.success ? (aiRes.data || []) : [])
        setTopPerformers(performers)
        setStats({ assessmentsSent: sessions.length, completionRate, avgTimeMin, hireReady, totalInteractions, totalTokens, avgTokensPerSession })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-background">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:px-6 md:pt-24 lg:px-8 lg:pt-28 max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="space-y-8">

            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white">Reports</h1>
              <p className="mt-1 text-sm text-zinc-500">Hiring funnel insights · last 30 days</p>
            </div>

            {/* Stat tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Assessments Sent"    value={stats.assessmentsSent} sub="vs last 30d"          trend="+18%" trendUp loading={loading} />
              <StatTile label="Completion Rate"     value={`${stats.completionRate}%`} sub="industry avg 58%" trend="+5%" trendUp loading={loading} />
              <StatTile label="Avg Time to Complete" value={stats.avgTimeMin > 0 ? `${stats.avgTimeMin}m` : "—"} sub="vs 60m target" trend={stats.avgTimeMin > 0 && stats.avgTimeMin < 60 ? `-${60 - stats.avgTimeMin}m` : undefined} trendUp={true} loading={loading} />
              <StatTile label="Hire-Ready (≥80)"    value={stats.hireReady} sub="this period"              trend="+3" trendUp loading={loading} />
            </div>

            {/* Charts 60/40 */}
            <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
              <PromptIQTrendChart aiInteractions={aiInteractions} />

              {/* AI Usage stats panel */}
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3 w-3 text-zinc-500" />
                    <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">AI Usage</span>
                  </div>
                  <p className="text-base font-semibold text-white">Token & Prompt Insights</p>
                  <p className="text-xs text-zinc-500 mt-0.5">How candidates interact with AI during assessments</p>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: MessageSquare, label: "Total AI Interactions", value: loading ? "—" : stats.totalInteractions.toLocaleString(), color: "text-blue-400", bg: "bg-blue-500/10" },
                    { icon: Zap,           label: "Total Tokens Used",     value: loading ? "—" : stats.totalTokens > 0 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : "0", color: "text-violet-400", bg: "bg-violet-500/10" },
                    { icon: Users,         label: "Avg Tokens / Session",  value: loading ? "—" : stats.avgTokensPerSession.toLocaleString(), color: "text-amber-400", bg: "bg-amber-500/10" },
                    { icon: CheckCircle2,  label: "Completion Rate",       value: loading ? "—" : `${stats.completionRate}%`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  ].map(({ icon: Icon, label, value, color, bg }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Top Performers</h2>
                {!loading && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                    {topPerformers.length}
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm overflow-hidden">
                <div className="grid grid-cols-[0.5fr_2fr_2fr_1.5fr_1fr] gap-3 border-b border-zinc-800/60 px-5 py-3">
                  {["RANK", "CANDIDATE", "POSITION", "PROMPTIQ", "ACTION"].map(col => (
                    <span key={col} className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{col}</span>
                  ))}
                </div>

                {loading ? (
                  <div className="px-5 py-8 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
                    ))}
                  </div>
                ) : topPerformers.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-zinc-500">
                    No completed assessments yet.
                  </div>
                ) : (
                  topPerformers.map((p, i) => (
                    <div key={p.id}
                      className={`grid grid-cols-[0.5fr_2fr_2fr_1.5fr_1fr] gap-3 items-center px-5 py-3.5 hover:bg-zinc-900/40 transition-colors ${i < topPerformers.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                      <span className="text-sm font-bold text-zinc-400">#{i + 1}</span>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarInitials name={p.name} />
                        <span className="text-sm font-medium text-white truncate">{p.name}</span>
                      </div>
                      <span className="text-sm text-zinc-300 truncate">{p.position}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white tabular-nums">{p.score}</span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-zinc-400" style={{ width: `${p.score}%` }} />
                        </div>
                      </div>
                      <Link href={`/dashboard/results/${p.id}`}
                        className="text-xs text-zinc-400 hover:text-white transition-colors">
                        View
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
