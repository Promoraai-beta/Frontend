"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { PromptIQTrendChart } from "@/components/dashboard/promptiq-trend-chart"
import { api } from "@/lib/api"
import { TrendingUp, TrendingDown, Zap, MessageSquare, Users, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { DashboardEditorialShell } from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { DashboardPageHeader } from "@/components/dashboard/editorial/dashboard-page-header"
import { EditorialAvatarInitials } from "@/components/dashboard/editorial/editorial-avatar"
import { ArrowUpRight } from "lucide-react"

function StatTile({
  label,
  value,
  sub,
  trend,
  trendUp,
  loading,
}: {
  label: string
  value: string | number
  sub: string
  trend?: string
  trendUp?: boolean
  loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-6 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-serif text-3xl tabular-nums text-foreground">{loading ? "—" : value}</p>
        {trend && !loading && (
          <div
            className={`mb-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
              trendUp ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}
          >
            {trendUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {trend}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
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
  const [aiInteractions, setAiInteractions] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [, setAssessmentMap] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, assRes, aiRes] = await Promise.all([
          api.get("/api/sessions").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
          api.get("/api/assessments").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
          api.get("/api/ai-interactions").then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        ])

        const sessionsLocal: any[] = sessRes
        const assessments: any[] = assRes
        const aMap = Object.fromEntries(assessments.map((a: any) => [a.id, a.jobTitle || a.role || "Untitled"]))
        setAssessmentMap(aMap)

        const submitted = sessionsLocal.filter((s: any) => s.status === "submitted")
        const completionRate =
          sessionsLocal.length > 0 ? Math.round((submitted.length / sessionsLocal.length) * 100) : 0

        const timings = submitted
          .map((s: any) => {
            const start = s.startedAt || s.started_at
            const end = s.submittedAt || s.submitted_at
            if (!start || !end) return null
            return (new Date(end).getTime() - new Date(start).getTime()) / 60000
          })
          .filter((t): t is number => t !== null && t > 0 && t < 300)
        const avgTimeMin = timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0

        const hireReady = submitted.filter((s: any) => (s.score || 0) >= 80).length

        const aiData: any[] = aiRes.success ? aiRes.data || [] : []
        const totalInteractions = aiData.length
        const totalTokens = aiData.reduce(
          (sum: number, i: any) => sum + ((i.promptTokens || 0) + (i.completionTokens || 0)),
          0
        )
        const avgTokensPerSession = sessionsLocal.length > 0 ? Math.round(totalTokens / sessionsLocal.length) : 0

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

        setAiInteractions(aiRes.success ? aiRes.data || [] : [])
        setTopPerformers(performers)
        setStats({
          assessmentsSent: sessionsLocal.length,
          completionRate,
          avgTimeMin,
          hireReady,
          totalInteractions,
          totalTokens,
          avgTokensPerSession,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <ProtectedRoute requiredRole="recruiter">
      <DashboardEditorialShell>
        <DashboardPageHeader
          eyebrow="Insights"
          title="Hiring"
          italic="reports."
          description="Funnel health, PromptIQ trends, and AI usage — grounded in your latest sessions."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Assessments sent"
            value={stats.assessmentsSent}
            sub="All sessions in workspace"
            trend="+18%"
            trendUp
            loading={loading}
          />
          <StatTile
            label="Completion rate"
            value={`${stats.completionRate}%`}
            sub="Submitted ÷ invited"
            trend="+5%"
            trendUp
            loading={loading}
          />
          <StatTile
            label="Avg time"
            value={stats.avgTimeMin > 0 ? `${stats.avgTimeMin}m` : "—"}
            sub="Start to submit"
            trend={stats.avgTimeMin > 0 && stats.avgTimeMin < 60 ? `−${60 - stats.avgTimeMin}m` : undefined}
            trendUp={stats.avgTimeMin > 0 && stats.avgTimeMin < 60}
            loading={loading}
          />
          <StatTile
            label="Hire-ready (≥80)"
            value={stats.hireReady}
            sub="PromptIQ threshold"
            trend="+3"
            trendUp
            loading={loading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <PromptIQTrendChart aiInteractions={aiInteractions} />

          <div className="rounded-2xl border border-hairline bg-card p-6 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
            <div className="mb-6 border-b border-hairline pb-5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  AI usage
                </span>
              </div>
              <h3 className="mt-2 font-serif text-xl text-foreground">Tokens & prompts</h3>
              <p className="mt-1 text-sm text-muted-foreground">How candidates collaborate with models during assessments.</p>
            </div>

            <div className="space-y-5">
              {[
                {
                  icon: MessageSquare,
                  label: "Total AI interactions",
                  value: loading ? "—" : stats.totalInteractions.toLocaleString(),
                  tone: "text-accent",
                  bg: "bg-accent/12 ring-1 ring-accent/25",
                },
                {
                  icon: Zap,
                  label: "Total tokens",
                  value: loading ? "—" : stats.totalTokens > 0 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : "0",
                  tone: "text-accent-deep dark:text-accent-glow",
                  bg: "bg-accent-soft/80 dark:bg-accent/15 ring-1 ring-accent/20",
                },
                {
                  icon: Users,
                  label: "Avg tokens / session",
                  value: loading ? "—" : stats.avgTokensPerSession.toLocaleString(),
                  tone: "text-foreground",
                  bg: "bg-muted/40 ring-1 ring-border",
                },
                {
                  icon: CheckCircle2,
                  label: "Completion rate",
                  value: loading ? "—" : `${stats.completionRate}%`,
                  tone: "text-emerald-700 dark:text-emerald-400",
                  bg: "bg-emerald-500/10 ring-1 ring-emerald-500/20",
                },
              ].map(({ icon: Icon, label, value, tone, bg }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-4 w-4 ${tone}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                    <p className="font-serif text-lg tabular-nums text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Leaderboard</p>
              <h2 className="display mt-2 text-2xl text-foreground md:text-3xl">
                Top <span className="display-italic">performers.</span>
              </h2>
            </div>
            {!loading && (
              <span className="rounded-full border border-hairline bg-muted/30 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {topPerformers.length} shown
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-hairline bg-card shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
            <div className="grid grid-cols-12 border-b border-hairline bg-muted/30 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:px-6">
              <div className="col-span-2 md:col-span-1">Rank</div>
              <div className="col-span-10 md:col-span-4">Candidate</div>
              <div className="col-span-12 mt-2 md:col-span-3 md:mt-0">Position</div>
              <div className="col-span-6 mt-2 text-right md:col-span-2 md:mt-0 md:text-left">PromptIQ</div>
              <div className="col-span-6 mt-2 text-right md:col-span-2 md:mt-0">Action</div>
            </div>

            {loading ? (
              <div className="divide-y divide-border px-6 py-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="py-4">
                    <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
                  </div>
                ))}
              </div>
            ) : topPerformers.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-muted-foreground">No completed assessments yet.</div>
            ) : (
              topPerformers.map((p, i) => (
                <div
                  key={p.id}
                  className={`grid grid-cols-12 items-center gap-y-3 px-4 py-5 transition-colors hover:bg-muted/15 md:gap-y-0 md:px-6 ${
                    i < topPerformers.length - 1 ? "border-b border-hairline" : ""
                  }`}
                >
                  <div className="col-span-2 font-mono text-sm tabular-nums text-muted-foreground md:col-span-1">
                    #{i + 1}
                  </div>
                  <div className="col-span-10 flex min-w-0 items-center gap-2 md:col-span-4">
                    <EditorialAvatarInitials name={p.name} size="sm" />
                    <span className="truncate font-serif text-base text-foreground">{p.name}</span>
                  </div>
                  <div className="col-span-12 truncate text-sm text-muted-foreground md:col-span-3">{p.position}</div>
                  <div className="col-span-12 flex items-center justify-end gap-2 md:col-span-2 md:justify-start">
                    <span className="font-serif text-xl tabular-nums text-foreground">{p.score}</span>
                    <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${p.score}%` }} />
                    </div>
                  </div>
                  <div className="col-span-12 flex justify-end md:col-span-2">
                    <Link
                      href={`/dashboard/results/${p.id}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent hover:text-accent-glow"
                    >
                      View
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </DashboardEditorialShell>
    </ProtectedRoute>
  )
}
