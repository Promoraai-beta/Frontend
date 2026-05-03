"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { Monitor, Video, VideoOff, MonitorOff, Clock, RefreshCw, Eye, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-sm font-bold text-white flex-shrink-0">
      {initials.toUpperCase()}
    </div>
  )
}

function ElapsedTimer({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    if (!startedAt) { setElapsed("—"); return }
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
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const [sessRes, assRes] = await Promise.all([
        api.get("/api/sessions").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
        api.get("/api/assessments").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
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
    const id = setInterval(load, 15000) // auto-refresh every 15s
    return () => clearInterval(id)
  }, [load])

  const assessmentMap = Object.fromEntries(assessments.map(a => [a.id, a.jobTitle || a.role || "Assessment"]))

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-background">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:px-6 md:pt-24 lg:px-8 lg:pt-28 max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">Live Sessions</h1>
                  {!loading && sessions.length > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      {sessions.length} live
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Candidates currently taking assessments · auto-refreshes every 15s
                </p>
              </div>
              <button onClick={() => { setLoading(true); load() }}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Last refresh */}
            <p className="text-[11px] text-zinc-600">
              Last updated: {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>

            {/* Cards grid */}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-xl bg-zinc-900/60 border border-zinc-800/60" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 py-24 text-center">
                <WifiOff className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 font-medium">No active sessions right now</p>
                <p className="text-zinc-600 text-sm mt-1">This page auto-refreshes when candidates start their assessment</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session, i) => {
                    const position = assessmentMap[session.assessmentId] || "Assessment"
                    const hasWebcam     = true  // assume live streams available when session is active
                    const hasScreenshare = true

                    return (
                      <motion.div key={session.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative rounded-xl border border-zinc-800/70 bg-zinc-950/60 backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900/60 transition-all overflow-hidden"
                      >
                        {/* Live pulse strip */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />

                        {/* Screen preview placeholder */}
                        <div className="relative h-36 bg-zinc-900/80 border-b border-zinc-800/60 flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950" />
                          <div className="relative flex flex-col items-center gap-2 text-zinc-600">
                            <Monitor className="h-8 w-8" />
                            <span className="text-xs">Screen preview</span>
                          </div>
                          {/* Stream indicators top-right */}
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${hasWebcam ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-600"}`}>
                              <Video className="h-3 w-3" />CAM
                            </div>
                            <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${hasScreenshare ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-600"}`}>
                              <Monitor className="h-3 w-3" />SCREEN
                            </div>
                          </div>
                          {/* Live badge top-left */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-red-500/20 border border-red-500/30 px-1.5 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                            <span className="text-[10px] font-semibold text-red-400">LIVE</span>
                          </div>
                          {/* Elapsed timer bottom-left */}
                          <div className="absolute bottom-2 left-2 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <ElapsedTimer startedAt={session.startedAt || session.started_at} />
                          </div>
                        </div>

                        {/* Candidate info */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={session.candidateName || "?"} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{session.candidateName || "Unknown"}</p>
                              <p className="text-xs text-zinc-500 truncate">{session.candidateEmail || ""}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 flex-shrink-0">
                              <Wifi className="h-3 w-3" />
                              <span className="font-medium">Online</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500 truncate">{position}</span>
                            <Link href={`/dashboard/live/${session.id}`}
                              className="flex items-center gap-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors px-3 py-1.5 text-xs font-semibold">
                              <Eye className="h-3.5 w-3.5" />Monitor
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
