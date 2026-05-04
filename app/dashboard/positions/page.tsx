"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { CandidateList } from "@/components/dashboard/candidate-list"
import { api } from "@/lib/api"
import { CreateAssessmentModal } from "@/components/dashboard/create-assessment-modal"
import { motion } from "framer-motion"
import { DashboardEditorialShell } from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { DashboardPageHeader } from "@/components/dashboard/editorial/dashboard-page-header"
import { JobCard } from "@/components/dashboard/job-card"

const PAGE_SIZE = 9

export default function PositionsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [page, setPage] = useState(1)

  const loadData = async () => {
    try {
      setLoading(true)
      const activeParam = activeFilter === "active" ? "true" : activeFilter === "inactive" ? "false" : undefined
      const url = activeParam ? `/api/assessments?active=${activeParam}` : "/api/assessments"

      const [assessmentsRes, sessionsRes] = await Promise.all([
        api.get(url).then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
        api.get("/api/sessions").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
      ])
      setAssessments(assessmentsRes)
      setSessions(sessionsRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    loadData()
  }, [activeFilter])

  const jobs = assessments.map((a) => {
    const asSessions = sessions.filter((s) => s.assessmentId === a.id)
    const completed = asSessions.filter((s) => s.status === "submitted").length
    const attempted = asSessions.filter((s) => s.status === "active" || s.status === "submitted").length
    const scores = asSessions.map((s) => s.score).filter((sc): sc is number => typeof sc === "number" && sc > 0)
    const avgScore = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : 0
    const isActive = a.isActive !== undefined ? a.isActive : true
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

  const activeCount = jobs.filter((j) => j.isActive).length
  const inactiveCount = jobs.filter((j) => !j.isActive).length

  const total = jobs.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIdx = (safePage - 1) * PAGE_SIZE
  const pageJobs = jobs.slice(startIdx, startIdx + PAGE_SIZE)
  const showingFrom = total === 0 ? 0 : startIdx + 1
  const showingTo = startIdx + pageJobs.length

  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      const r = await api.patch(`/api/assessments/${id}/status`, { isActive: !current })
      const d = await r.json()
      if (d.success) loadData()
      else alert(d.error || "Failed")
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this position? This cannot be undone.")) return
    try {
      const r = await api.delete(`/api/assessments/${id}`)
      const d = await r.json()
      if (d.success) {
        loadData()
        if (selectedJobId === id) setSelectedJobId(null)
      } else alert(d.error || "Failed")
    } catch (e: any) {
      alert(e.message)
    }
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId)
  const filteredCandidates = selectedJobId
    ? sessions
        .filter((s) => s.assessmentId === selectedJobId)
        .map((s) => {
          const fmt = (d: any) =>
            d
              ? new Date(d).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : undefined
          return {
            id: s.id,
            sessionId: s.id,
            name: s.candidateName || "Unknown",
            email: s.candidateEmail || "",
            jobId: s.assessmentId,
            assessmentStatus: (s.status === "pending"
              ? "not-started"
              : s.status === "active"
                ? "in-progress"
                : "completed") as any,
            score: s.score,
            attemptedAt: fmt(s.startedAt),
            submittedAt: fmt(s.submittedAt),
            duration: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : undefined,
            complianceViolations: 0,
          }
        })
    : []

  const pillGroup = "inline-flex rounded-full border border-hairline bg-muted/20 p-1 backdrop-blur-sm"

  return (
    <ProtectedRoute requiredRole="recruiter">
      <DashboardEditorialShell animateEnter={!selectedJobId}>
        {!selectedJobId ? (
          <>
            <DashboardPageHeader
              eyebrow="Pipeline"
              title="Open"
              italic="positions."
              description={
                loading ? (
                  "Loading…"
                ) : (
                  <>
                    {jobs.length} total · {activeCount} live
                    {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}
                  </>
                )
              }
              actions={
                <Button
                  type="button"
                  variant="accentSolid"
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2 rounded-full px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New position
                </Button>
              }
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className={pillGroup} role="tablist" aria-label="Filter positions">
                {(["all", "active", "inactive"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === f}
                    onClick={() => setActiveFilter(f)}
                    className={`rounded-full px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                      activeFilter === f
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className={pillGroup} role="group" aria-label="Layout">
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={`rounded-full p-2 transition-colors ${
                    viewMode === "list"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-2xl border border-hairline bg-muted/25"
                  />
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <>
                <div
                  className={
                    viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"
                  }
                >
                  {pageJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => setSelectedJobId(job.id)}
                      isSelected={false}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                      avgScore={job.avgScore}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-hairline bg-muted/[0.08] px-5 py-5 md:flex-row md:px-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Showing <span className="text-foreground">{showingFrom}</span>–
                    <span className="text-foreground">{showingTo}</span> of{" "}
                    <span className="text-foreground">{total}</span>
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-35"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </button>
                      <span className="min-w-[7rem] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Page {safePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-35"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-hairline bg-card px-6 py-20 text-center shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
                <p className="font-serif text-xl text-foreground">No positions yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Create a role to invite candidates and collect PromptIQ signals.
                </p>
                <Button
                  type="button"
                  variant="accentSolid"
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-6 gap-2 rounded-full px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create first position
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <CandidateList
              candidates={filteredCandidates}
              jobTitle={selectedJob?.title || "Assessment"}
              isActive={selectedJob?.isActive ?? true}
              onBack={() => setSelectedJobId(null)}
              assessmentId={selectedJobId ?? undefined}
              onRefresh={loadData}
            />
          </motion.div>
        )}
      </DashboardEditorialShell>

      <CreateAssessmentModal open={createModalOpen} onOpenChange={setCreateModalOpen} onSuccess={loadData} />
    </ProtectedRoute>
  )
}
