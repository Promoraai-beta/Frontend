"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import { Search, X } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-xs font-semibold text-white flex-shrink-0 shadow">
      {initials.toUpperCase()}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />Completed</Badge>
  if (status === "in-progress")
    return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />In Progress</Badge>
  return <Badge className="bg-zinc-700/60 text-zinc-400 border border-zinc-600/30 text-xs font-medium gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-zinc-500 inline-block" />Invited</Badge>
}

function PromptIQBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right text-sm font-semibold tabular-nums text-white">{score}</span>
      <div className="w-20 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full bg-zinc-400" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, assRes] = await Promise.all([
          api.get("/api/sessions").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
          api.get("/api/assessments").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
        ])
        setSessions(sessRes)
        setAssessments(assRes)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const assessmentMap = Object.fromEntries(assessments.map(a => [a.id, a.jobTitle || a.role || "Untitled"]))

  const candidates = sessions.map(s => ({
    id: s.id,
    name: s.candidateName || s.candidate_name || "Unknown",
    email: s.candidateEmail || s.candidate_email || "",
    position: assessmentMap[s.assessmentId] || "—",
    assessmentId: s.assessmentId,
    status: s.status === "pending" ? "not-started" : s.status === "active" ? "in-progress" : "completed",
    score: s.score,
  }))

  const filtered = candidates.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.position.toLowerCase().includes(search.toLowerCase())
  )

  const total      = filtered.length
  const completed  = filtered.filter(c => c.status === "completed").length
  const inProgress = filtered.filter(c => c.status === "in-progress").length

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
                <h1 className="text-3xl font-bold text-white">Candidates</h1>
                {!loading && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {total} total · {completed} completed · {inProgress} in progress
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showSearch ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search candidates…"
                      className="pl-8 pr-8 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 w-56" />
                    <button onClick={() => { setSearch(""); setShowSearch(false) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowSearch(true)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                    <Search className="h-4 w-4" />Search
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1.5fr_0.8fr] gap-3 border-b border-zinc-800/60 px-5 py-3">
                {["NAME", "EMAIL", "POSITION", "STATUS", "PROMPTIQ", "ACTION"].map(col => (
                  <span key={col} className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{col}</span>
                ))}
              </div>

              {loading ? (
                <div className="px-5 py-10 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-zinc-500">
                  {search ? "No candidates match your search." : "No candidates yet. Invite candidates from any position."}
                </div>
              ) : (
                filtered.map((c, i) => (
                  <div key={c.id}
                    className={`grid grid-cols-[2fr_2fr_2fr_1.5fr_1.5fr_0.8fr] gap-3 items-center px-5 py-3.5 hover:bg-zinc-900/40 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarInitials name={c.name} />
                      <span className="text-sm font-medium text-white truncate">{c.name}</span>
                    </div>
                    {/* Email */}
                    <span className="text-xs font-mono text-zinc-400 truncate">{c.email}</span>
                    {/* Position */}
                    <span className="text-sm text-zinc-300 truncate">{c.position}</span>
                    {/* Status */}
                    <StatusBadge status={c.status} />
                    {/* PromptIQ */}
                    <div>
                      {c.score !== undefined && c.score > 0
                        ? <PromptIQBar score={c.score} />
                        : <span className="text-sm text-zinc-600">—</span>}
                    </div>
                    {/* Action */}
                    <div>
                      {c.status === "completed"
                        ? <Link href={`/dashboard/results/${c.id}`} className="text-xs text-zinc-400 hover:text-white transition-colors">View</Link>
                        : c.status === "in-progress"
                        ? <Link href={`/dashboard/live/${c.id}`} className="text-xs text-zinc-400 hover:text-white transition-colors">Live</Link>
                        : <span className="text-xs text-zinc-600">—</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
