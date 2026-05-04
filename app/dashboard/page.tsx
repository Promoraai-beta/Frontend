"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import {
  RECRUITER_DASH_MAIN_OUTER,
  RECRUITER_DASH_MAIN_INNER,
} from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { CandidateList } from "@/components/dashboard/candidate-list"
import { api } from "@/lib/api"
import { CreateAssessmentModal } from "@/components/dashboard/create-assessment-modal"
import { DashboardHero } from "@/components/dashboard/editorial/dashboard-hero"
import { DashboardMetricStrip } from "@/components/dashboard/editorial/dashboard-metric-strip"
import { SubmissionsPipelineSection } from "@/components/dashboard/editorial/submissions-pipeline"
import {
  PositionsEditorialTable,
  type EditorialPositionRow,
} from "@/components/dashboard/editorial/positions-table"
import { ActivityInsightSection } from "@/components/dashboard/editorial/activity-insight"
import {
  avgPromptIQFromSubmissions,
  buildActivityFeed,
  completedAssessmentsPrevWeek,
  completedAssessmentsThisWeek,
} from "@/components/dashboard/editorial/dashboard-data"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const [assessmentsRes, sessionsRes, submissionsRes] = await Promise.all([
        api
          .get("/api/assessments")
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data) => (data.success ? data.data || [] : []))
          .catch(() => []),
        api
          .get("/api/sessions")
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data) => (data.success ? data.data || [] : []))
          .catch(() => []),
        api
          .get("/api/submissions")
          .then((r) => r.json())
          .catch(() => ({ success: false, data: [] })),
      ])

      setAssessments(assessmentsRes)
      setSessions(sessionsRes)
      setSubmissions(submissionsRes.success ? submissionsRes.data || [] : [])
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    loadDashboard()
  }, [loadDashboard])

  const sessionIds = useMemo(() => new Set(sessions.map((s: any) => String(s.id))), [sessions])

  const assessmentTitle = useCallback(
    (aid: string) => {
      const a = assessments.find((x: any) => String(x.id) === aid)
      return a?.jobTitle || a?.role || "Assessment"
    },
    [assessments]
  )

  const jobs = useMemo(() => {
    return assessments.map((assessment: any) => {
      const assessmentSessions = sessions.filter((s) => s.assessmentId === assessment.id)
      const candidatesSelected = assessmentSessions.length
      const isActive = assessment.isActive !== undefined ? assessment.isActive : true
      return {
        id: assessment.id,
        title: assessment.jobTitle || assessment.role || "Untitled Assessment",
        department: assessment.level || "Engineering",
        candidatesSelected,
        createdAt: assessment.createdAt
          ? new Date(assessment.createdAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        isActive,
      }
    })
  }, [assessments, sessions])

  const editorialRows: EditorialPositionRow[] = useMemo(() => {
    return jobs.map((job) => {
      const ids = sessions.filter((s) => s.assessmentId === job.id).map((s) => String(s.id))
      const subs = submissions.filter((sub) =>
        ids.includes(String(sub.sessionId || sub.session_id))
      )
      const iq =
        subs.length > 0
          ? Math.round(subs.reduce((sum, sub) => sum + (Number(sub.score) || 0), 0) / subs.length)
          : null
      const created = new Date(job.createdAt)
      const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000))
      const tags = [job.department].filter(Boolean)
      return {
        id: job.id,
        title: job.title,
        status: job.isActive ? ("Live" as const) : ("Draft" as const),
        iq,
        candidates: job.candidatesSelected,
        days,
        tags,
      }
    })
  }, [jobs, sessions, submissions])

  const avgIQ = useMemo(
    () => avgPromptIQFromSubmissions(submissions, sessionIds),
    [submissions, sessionIds]
  )

  const weekCompleted = useMemo(() => completedAssessmentsThisWeek(sessions), [sessions])
  const prevWeekCompleted = useMemo(() => completedAssessmentsPrevWeek(sessions), [sessions])
  const weekDeltaPct = useMemo(() => {
    if (prevWeekCompleted > 0)
      return Math.round(((weekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100)
    return weekCompleted > 0 ? 100 : null
  }, [weekCompleted, prevWeekCompleted])

  const activeRoles = useMemo(
    () => assessments.filter((a: any) => a.isActive !== false).length,
    [assessments]
  )

  const hiringThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    return assessments.filter((a: any) => {
      const t = new Date(a.createdAt || 0).getTime()
      return t >= cutoff && a.isActive !== false
    }).length
  }, [assessments])

  const awaitingReview = sessions.filter((s) => s.status === "submitted").length
  const activeLive = sessions.filter((s) => s.status === "active").length
  const activity = useMemo(
    () => buildActivityFeed(sessions as any[], assessmentTitle, 6),
    [sessions, assessmentTitle]
  )

  const above90Week = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    const seen = new Set<string>()
    for (const sub of submissions) {
      if ((Number(sub.score) || 0) < 90) continue
      const sid = String(sub.sessionId || sub.session_id)
      const sess = sessions.find((s) => String(s.id) === sid)
      const t = new Date(sess?.submittedAt || sess?.updatedAt || 0).getTime()
      if (t >= cutoff && !seen.has(sid)) seen.add(sid)
    }
    return seen.size
  }, [submissions, sessions])

  const { topScore, topName } = useMemo(() => {
    let best: number | null = null
    let name: string | null = null
    for (const sub of submissions) {
      const sc = Number(sub.score) || 0
      if (best != null && sc <= best) continue
      best = sc
      const sid = String(sub.sessionId || sub.session_id)
      const sess = sessions.find((s) => String(s.id) === sid)
      name = String(sess?.candidateName || sess?.candidate_name || "Candidate")
    }
    return { topScore: best, topName: name }
  }, [submissions, sessions])

  const insightHeadline = useMemo(() => {
    if (above90Week > 0) {
      const n = Math.min(above90Week, 99)
      return (
        <>
          Your top{" "}
          <span className="display-italic text-accent-glow">{n}</span>{" "}
          {n === 1 ? "candidate" : "candidates"} this week scored above{" "}
          <span className="display-italic text-accent-glow">90.</span>
        </>
      )
    }
    return (
      <>
        <span className="display-italic text-accent-glow">PromptIQ</span> highlights appear once candidates
        finish assessments — keep your pipeline moving.
      </>
    )
  }, [above90Week])

  const insightBody = useMemo(() => {
    if (above90Week > 0 && avgIQ > 0) {
      return `Your rolling average PromptIQ is ${avgIQ}. Strong scores often correlate with clear problem decomposition — consider prioritizing those candidates for live rounds.`
    }
    return "PromptIQ measures how thoughtfully candidates collaborate with AI — not just whether code compiles. Use submissions over time to spot momentum in your funnel."
  }, [above90Week, avgIQ])

  const filteredCandidates = selectedJobId
    ? sessions
        .filter((s) => s.assessmentId === selectedJobId)
        .map((s) => {
          const formatDate = (date: string | Date | null | undefined) => {
            if (!date) return undefined
            try {
              return new Date(date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            } catch {
              return undefined
            }
          }
          return {
            id: s.id,
            sessionId: s.id,
            name: s.candidateName || s.candidate_name || "Unknown",
            email: s.candidateEmail || s.candidate_email || "",
            jobId: s.assessmentId || selectedJobId,
            assessmentStatus: (s.status === "pending"
              ? "not-started"
              : s.status === "active"
                ? "in-progress"
                : "completed") as "not-started" | "in-progress" | "completed",
            score: s.score,
            attemptedAt: formatDate(s.startedAt || s.started_at),
            submittedAt: formatDate(s.submittedAt || s.submitted_at),
            duration: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : undefined,
            complianceViolations: 0,
          }
        })
    : []

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || assessments.find((a: any) => a.id === selectedJobId)

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="hero-bg hero-bg-grid relative min-h-screen text-foreground">
        <RecruiterNavbar />

        <main className={RECRUITER_DASH_MAIN_OUTER}>
          <div className={RECRUITER_DASH_MAIN_INNER}>
          {!selectedJobId ? (
            <>
              <DashboardHero
                greeting={getGreeting()}
                awaitingReview={awaitingReview}
                activeLive={activeLive}
                onNewPosition={() => setCreateModalOpen(true)}
                onReviewQueue={() => router.push("/dashboard/reports")}
              />

              <DashboardMetricStrip
                weekCompleted={weekCompleted}
                weekDeltaPct={weekDeltaPct}
                avgPromptIQ={avgIQ}
                activeRoles={activeRoles}
                hiringThisWeek={hiringThisWeek}
                inReview={awaitingReview}
                loading={loading}
              />

              <SubmissionsPipelineSection sessions={sessions} />

              <PositionsEditorialTable
                positions={editorialRows}
                loading={loading}
                onOpenPosition={(id) => setSelectedJobId(id)}
              />

              <ActivityInsightSection
                activity={activity}
                headline={insightHeadline}
                body={insightBody}
                topScore={topScore}
                topName={topName}
                reportHref="/dashboard/reports"
              />
            </>
          ) : (
            <CandidateList
              candidates={filteredCandidates}
              jobTitle={
                (selectedJob as any)?.title ||
                (selectedJob as any)?.jobTitle ||
                (selectedJob as any)?.role ||
                "Assessment"
              }
              isActive={(selectedJob as any)?.isActive ?? true}
              onBack={() => setSelectedJobId(null)}
              assessmentId={selectedJobId ?? undefined}
              onRefresh={loadDashboard}
            />
          )}
        </div>
        </main>
      </div>

      <CreateAssessmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadDashboard}
      />
    </ProtectedRoute>
  )
}
