"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Plus } from "lucide-react"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { JobCard } from "@/components/dashboard/job-card"
import { CandidateList } from "@/components/dashboard/candidate-list"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { PromptIQChart } from "@/components/dashboard/promptiq-chart"
import { AIUsageBreakdown } from "@/components/dashboard/ai-usage-breakdown"
import { AnimatedBackground } from "@/components/animated-background"
import { api } from "@/lib/api"
import { CreateAssessmentModal } from "@/components/dashboard/create-assessment-modal"
import { useAuth } from "@/components/auth-provider"
import { motion } from "framer-motion"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const loadAssessments = async () => {
    try {
      setLoading(true)
      const activeParam = activeFilter === 'active' ? 'true' : activeFilter === 'inactive' ? 'false' : undefined
      const url = activeParam ? `/api/assessments?active=${activeParam}` : '/api/assessments'

      const [assessmentsRes, sessionsRes] = await Promise.all([
        api.get(url)
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
          .then(data => data.success ? (data.data || []) : [])
          .catch(() => []),
        api.get('/api/sessions')
          .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() })
          .then(data => data.success ? (data.data || []) : [])
          .catch(() => [])
      ])

      setAssessments(assessmentsRes)
      setSessions(sessionsRes)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    loadAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  const jobs = assessments.map((assessment) => {
    const assessmentSessions = sessions.filter(s => s.assessmentId === assessment.id)
    const candidatesSelected = assessmentSessions.length
    const candidatesAttempted = assessmentSessions.filter(s => s.status === 'active' || s.status === 'submitted').length
    const candidatesCompleted = assessmentSessions.filter(s => s.status === 'submitted').length
    const isActive = assessment.isActive !== undefined ? assessment.isActive : true

    return {
      id: assessment.id,
      title: assessment.jobTitle || assessment.role || 'Untitled Assessment',
      department: assessment.level || 'Engineering',
      location: 'Remote',
      company: assessment.company?.name || 'Your Company',
      companyLogo: assessment.company?.logo || null,
      candidatesSelected,
      candidatesAttempted,
      candidatesCompleted,
      assessmentType: 'Technical Assessment',
      createdAt: assessment.createdAt ? new Date(assessment.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: isActive ? 'active' as const : 'draft' as const,
      isActive
    }
  })

  const handleToggleStatus = async (assessmentId: string, currentStatus: boolean) => {
    try {
      const response = await api.patch(`/api/assessments/${assessmentId}/status`, { isActive: !currentStatus })
      const data = await response.json()
      if (data.success) loadAssessments()
      else alert(data.error || 'Failed to update assessment status')
    } catch (error: any) {
      alert(error.message || 'Failed to update assessment status')
    }
  }

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) return
    try {
      const response = await api.delete(`/api/assessments/${assessmentId}`)
      const data = await response.json()
      if (data.success) {
        loadAssessments()
        if (selectedJobId === assessmentId) setSelectedJobId(null)
      } else {
        alert(data.error || 'Failed to delete assessment')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete assessment')
    }
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || assessments.find(a => a.id === selectedJobId)

  const filteredCandidates = selectedJobId
    ? sessions
        .filter((s) => s.assessmentId === selectedJobId)
        .map((s) => {
          const formatDate = (date: string | Date | null | undefined) => {
            if (!date) return undefined
            try {
              return new Date(date).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
              })
            } catch { return undefined }
          }
          return {
            id: s.id,
            sessionId: s.id,
            name: s.candidateName || s.candidate_name || 'Unknown',
            email: s.candidateEmail || s.candidate_email || '',
            jobId: s.assessmentId || selectedJobId,
            assessmentStatus: (s.status === 'pending' ? 'not-started' : s.status === 'active' ? 'in-progress' : 'completed') as 'not-started' | 'in-progress' | 'completed',
            score: s.score,
            attemptedAt: formatDate(s.startedAt || s.started_at),
            submittedAt: formatDate(s.submittedAt || s.submitted_at),
            duration: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : undefined,
            complianceViolations: 0
          }
        })
    : []

  const activeSessionCount = sessions.filter(s => s.status === 'active').length
  const awaitingReview = sessions.filter(s => s.status === 'submitted').length
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-background">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:px-6 md:pt-24 lg:px-8 lg:pt-28 max-w-7xl">

          {/* ── MAIN DASHBOARD VIEW ── */}
          {!selectedJobId ? (
            <div className="space-y-8">

              {/* Greeting header */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-start justify-between gap-4"
              >
                <div>
                  <h1 className="text-3xl font-bold text-white">{getGreeting()}, {firstName}</h1>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-zinc-400">
                    {activeSessionCount > 0 && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          {activeSessionCount} assessment{activeSessionCount !== 1 ? 's' : ''} running now
                        </span>
                        {awaitingReview > 0 && <span className="text-zinc-600">·</span>}
                      </>
                    )}
                    {awaitingReview > 0 && (
                      <span>{awaitingReview} awaiting your review</span>
                    )}
                    {activeSessionCount === 0 && awaitingReview === 0 && (
                      <span>No active sessions right now</span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-white text-black hover:bg-zinc-200 gap-2 font-medium flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  New Position
                </Button>
              </motion.div>

              {/* Stat tiles */}
              <DashboardStats />

              {/* Charts — 60/40 split */}
              <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
                <PromptIQChart sessions={sessions} />
                <AIUsageBreakdown sessions={sessions} />
              </div>

              {/* Positions section */}
              <div>
                {/* Section header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                      Recent Positions
                    </h2>
                    {!loading && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                        {Math.min(jobs.length, 5)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Filter pills */}
                    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                      {(["all", "active", "inactive"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setActiveFilter(f)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize ${
                            activeFilter === f
                              ? "bg-white text-black"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    {/* View mode */}
                    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-900/60 border border-zinc-800/60" />
                    ))}
                  </div>
                ) : jobs.length > 0 ? (
                  <>
                    <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                      {jobs.slice(0, 5).map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onClick={() => setSelectedJobId(job.id)}
                          isSelected={false}
                          onToggleStatus={handleToggleStatus}
                          onDelete={handleDeleteAssessment}
                        />
                      ))}
                    </div>
                    {jobs.length > 5 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => router.push("/dashboard/positions")}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-600 rounded-lg px-4 py-2"
                        >
                          View all {jobs.length} positions →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 py-16 text-center">
                    <p className="text-zinc-500 mb-4">No positions yet</p>
                    <Button
                      onClick={() => setCreateModalOpen(true)}
                      className="bg-white text-black hover:bg-zinc-200 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Your First Position
                    </Button>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* ── POSITION DETAIL VIEW ── */
            <CandidateList
              candidates={filteredCandidates}
              jobTitle={selectedJob?.title || selectedJob?.jobTitle || selectedJob?.role || "Assessment"}
              isActive={selectedJob?.isActive ?? selectedJob?.status === 'active'}
              onBack={() => setSelectedJobId(null)}
              assessmentId={selectedJobId ?? undefined}
              onRefresh={loadAssessments}
            />
          )}
        </div>
      </div>

      <CreateAssessmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadAssessments}
      />
    </ProtectedRoute>
  )
}
