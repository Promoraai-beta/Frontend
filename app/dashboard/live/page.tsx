"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Monitor, Video, Clock, RefreshCw, Eye, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { DashboardEditorialShell } from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { DashboardPageHeader } from "@/components/dashboard/editorial/dashboard-page-header"
import { EditorialAvatarInitials } from "@/components/dashboard/editorial/editorial-avatar"

function ElapsedTimer({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    if (!startedAt) {
      setElapsed("—")
      return
    }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m ${s.toString().padStart(2, "0")}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return <span className="tabular-nums">{elapsed}</span>
}

export default function LivePage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const [sessRes, assRes] = await Promise.all([
        api.get("/api/sessions").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
        api.get("/api/assessments").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
      ])
      setSessions(sessRes.filter((s: any) => s.status === "active"))
      setAssessments(assRes)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  const assessmentMap = Object.fromEntries(assessments.map((a) => [a.id, a.jobTitle || a.role || "Assessment"]))

  return (
    <ProtectedRoute requiredRole="recruiter">
      <DashboardEditorialShell>
        <DashboardPageHeader
          eyebrow="Monitoring"
          title="Live"
          italic="sessions."
          description={
            <>
              Candidates currently in assessments · refreshes every 15s
              <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/90">
                Last update ·{" "}
                {lastRefresh.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                load()
              }}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-muted/20 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-accent/35 hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          }
        />

        {!loading && sessions.length > 0 && (
          <p className="-mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 align-middle dark:bg-emerald-400" />
            {sessions.length} active now
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl border border-hairline bg-muted/25" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-3xl border border-hairline bg-card px-6 py-24 text-center shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
            <WifiOff className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
            <p className="font-serif text-xl text-foreground">No active sessions</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              When a candidate starts an assessment, they will appear here automatically.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session, i) => {
                const position = assessmentMap[session.assessmentId] || "Assessment"
                const hasWebcam = true
                const hasScreenshare = true

                return (
                  <motion.article
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: i * 0.04, duration: 0.35 }}
                    className="group relative overflow-hidden rounded-2xl border border-hairline bg-card shadow-[0_20px_60px_-40px_hsl(var(--accent)/0.25)] transition-colors hover:border-accent/25"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

                    <div className="relative flex h-36 items-center justify-center overflow-hidden border-b border-hairline bg-muted/20">
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.06] to-transparent" />
                      <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
                        <Monitor className="h-8 w-8 opacity-60" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Preview</span>
                      </div>

                      <div className="absolute right-2 top-2 flex gap-1.5">
                        <div
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                            hasWebcam
                              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border border-hairline bg-muted text-muted-foreground"
                          }`}
                        >
                          <Video className="h-3 w-3" />
                          Cam
                        </div>
                        <div
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                            hasScreenshare
                              ? "border border-accent/35 bg-accent/10 text-accent-deep dark:text-accent-glow"
                              : "border border-hairline bg-muted text-muted-foreground"
                          }`}
                        >
                          <Monitor className="h-3 w-3" />
                          Screen
                        </div>
                      </div>

                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        Live
                      </div>

                      <div className="absolute bottom-2 left-2 flex items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <ElapsedTimer startedAt={session.startedAt || session.started_at} />
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="flex items-center gap-3">
                        <EditorialAvatarInitials name={session.candidateName || "?"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-base text-foreground">{session.candidateName || "Unknown"}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">{session.candidateEmail || ""}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                          <Wifi className="h-3 w-3" />
                          Online
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
                        <span className="truncate text-sm text-muted-foreground">{position}</span>
                        <Link
                          href={`/dashboard/live/${session.id}`}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground shadow-[0_10px_28px_-12px_hsl(var(--accent)/0.55)] transition-colors hover:bg-accent-deep"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Monitor
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </DashboardEditorialShell>
    </ProtectedRoute>
  )
}
