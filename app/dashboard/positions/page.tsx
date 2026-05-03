"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Plus } from "lucide-react"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { JobCard } from "@/components/dashboard/job-card"
import { CandidateList } from "@/components/dashboard/candidate-list"
import { AnimatedBackground } from "@/components/animated-background"
import { api } from "@/lib/api"
import { CreateAssessmentModal } from "@/components/dashboard/create-assessment-modal"
import { motion } from "framer-motion"

export default function PositionsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const loadData = async () => {
    try {
      setLoading(true)
      const activeParam = activeFilter === "active" ? "true" : activeFilter === "inactive" ? "false" : undefined
      const url = activeParam ? `/api/assessments?active=${activeParam}` : "/api/assessments"

      const [assessmentsRes, sessionsRes] = await Promise.all([
        api.get(url).then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
        api.get("/api/sessions").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
      ])
      setAssessments(assessmentsRes)
      setSessions(sessionsRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [activeFilter])

  const jobs = assessments.map((a) => {
    const asSessions = sessions.filter(s => s.assessmentId === a.id)
    const completed  = asSessions.filter(s => s.status === "submitted").length
    const attempted  = asSessions.filter(s => s.status === "active" || s.status === "submitted").length
    const scores     = asSessions.map(s => s.score).filter((sc): sc is number => typeof sc === "number" && sc > 0)
    const avgScore   = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const isActive   = a.isActive !== undefined ? a.isActive : true
    return {
      id: a.id,
      title: a.jobTitle || a.role || "Untitled",
      department: a.level || "Engineering",
      location: "Remote",
      company: a.company?.name || "",
      companyLogo: a.company?.logo || null,
      candidatesSelected: asSessions.length,
      candidatesAttempted: attempted,
      candidatesCompleted: completed,
      assessmentType: "Technical Assessment",
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      status: isActive ? ("active" as const) : ("draft" as const),
      isActive,
      avgScore,
    }
  })

  const activeCount   = jobs.filter(j => j.isActive).length
  const inactiveCount = jobs.filter(j => !j.isActive).length

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      const r = await api.patch(`/api/assessments/${id}/status`, { isActive: !current })
      const d = await r.json()
      if (d.success) loadData(); else alert(d.error || "Failed")
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this position? This cannot be undone.")) return
    try {
      const r = await api.delete(`/api/assessments/${id}`)
      const d = await r.json()
      if (d.success) { loadData(); if (selectedJobId === id) setSelectedJobId(null) }
      else alert(d.error || "Failed")
    } catch (e: any) { alert(e.message) }
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId)
  const filteredCandidates = selectedJobId
    ? sessions
        .filter(s => s.assessmentId === selectedJobId)
        .map(s => {
          const fmt = (d: any) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : undefined
          return {
            id: s.id, sessionId: s.id,
            name: s.candidateName || "Unknown",
            email: s.candidateEmail || "",
            jobId: s.assessmentId,
            assessmentStatus: (s.status === "pending" ? "not-started" : s.status === "active" ? "in-progress" : "completed") as any,
            score: s.score,
            attemptedAt: fmt(s.startedAt),
            submittedAt: fmt(s.submittedAt),
            duration: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : undefined,
            complianceViolations: 0,
          }
        })
    : []

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-background">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:px-6 md:pt-24 lg:px-8 lg:pt-28 max-w-7xl">

          {!selectedJobId ? (
            <div className="space-y-6">
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white">Positions</h1>
                  {!loading && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {jobs.length} total · {activeCount} active
                      {inactiveCount > 0 && ` · ${inactiveCount} inactive`}
                    </p>
                  )}
                </div>
                <Button onClick={() => setCreateModalOpen(true)}
                  className="bg-white text-black hover:bg-zinc-200 gap-2 font-medium flex-shrink-0">
                  <Plus className="h-4 w-4" />New Position
                </Button>
              </motion.div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                  {(["all", "active", "inactive"] as const).map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize ${activeFilter === f ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                  <button onClick={() => setViewMode("grid")}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode("list")}
                    className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards */}
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-900/60 border border-zinc-800/60" />
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} onClick={() => setSelectedJobId(job.id)}
                      isSelected={false} onToggleStatus={handleToggleStatus} onDelete={handleDelete}
                      avgScore={job.avgScore} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 py-20 text-center">
                  <p className="text-zinc-500 mb-4">No positions yet</p>
                  <Button onClick={() => setCreateModalOpen(true)} className="bg-white text-black hover:bg-zinc-200 gap-2">
                    <Plus className="h-4 w-4" />Create Your First Position
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <CandidateList
              candidates={filteredCandidates}
              jobTitle={selectedJob?.title || "Assessment"}
              isActive={selectedJob?.isActive ?? true}
              onBack={() => setSelectedJobId(null)}
              assessmentId={selectedJobId ?? undefined}
              onRefresh={loadData}
            />
          )}
        </div>
      </div>

      <CreateAssessmentModal open={createModalOpen} onOpenChange={setCreateModalOpen} onSuccess={loadData} />
    </ProtectedRoute>
  )
}
