"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEditorialShell } from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { EditorialAvatarInitials } from "@/components/dashboard/editorial/editorial-avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, ArrowUpRight, FileDown } from "lucide-react"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { SessionDetailView } from "@/components/results/session-detail-view"

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.candidateId as string
  const [session, setSession] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [aiInteractions, setAiInteractions] = useState<any[]>([])
  const [videoChunks, setVideoChunks] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [agentInsights, setAgentInsights] = useState<{
    watcher: any
    extractor: any
    sanity: any
    judge?: any
    geminiVideoAnalysis?: any
    metrics?: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    async function loadSessionData() {
      try {
        setLoading(true)
        setError(null)

        const sessionRes = await api.get(`/api/sessions/${sessionId}`)
        const sessionData = await sessionRes.json()

        if (!sessionData.success) {
          throw new Error(sessionData.error || "Failed to load session")
        }
        const sessionDataObj = sessionData.data

        if (sessionDataObj.assessment?.assessmentType !== "recruiter") {
          throw new Error("Access denied. Recruiters can only view recruiter assessment results.")
        }

        setSession(sessionDataObj)

        const subsRes = await fetch(`${API_BASE_URL}/api/submissions?session_id=${sessionId}`)
          .then((r) => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (subsRes.success) setSubmissions(subsRes.data || [])

        const aiRes = await fetch(`${API_BASE_URL}/api/ai-interactions?session_id=${sessionId}`)
          .then((r) => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (aiRes.success) setAiInteractions(aiRes.data || [])

        const videoRes = await fetch(`${API_BASE_URL}/api/video/${sessionId}`)
          .then((r) => r.json())
          .catch(() => ({ success: false, data: {} }))
        if (videoRes.success && videoRes.data) {
          const webcamChunks = (videoRes.data.webcam || []).map((chunk: any) => ({
            ...chunk,
            streamType: "webcam",
          }))
          const screenshareChunks = (videoRes.data.screenshare || []).map((chunk: any) => ({
            ...chunk,
            streamType: "screenshare",
          }))
          setVideoChunks([...webcamChunks, ...screenshareChunks])
        }

        try {
          const agentsRes = await api.get(`/api/agents/full-report/${sessionId}`)
          const agentsData = await agentsRes.json()

          if (agentsData.success && agentsData.report) {
            const { watcher, extractor, sanity, judge, geminiVideoAnalysis, metrics } = agentsData.report

            if (watcher) {
              setViolations(watcher.violations || [])
              setRiskScore(watcher.riskScore || sanity?.riskScore || 0)
            }

            setAgentInsights({
              watcher: watcher || null,
              extractor: extractor || null,
              sanity: sanity || null,
              judge: judge || null,
              geminiVideoAnalysis: geminiVideoAnalysis || null,
              metrics: metrics || null,
            })
          } else {
            const watcherRes = await api.get(`/api/agents/watcher/${sessionId}`)
            const watcherData = await watcherRes.json()
            if (watcherData.success) {
              setViolations(watcherData.violations || [])
              setRiskScore(watcherData.riskScore || 0)
              setAgentInsights({
                watcher: watcherData,
                extractor: null,
                sanity: null,
              })
            }
          }
        } catch (agentsError) {
          console.warn("Failed to load agent insights, continuing without them:", agentsError)
        }
      } catch (err: any) {
        console.error("Error loading session data:", err)
        setError(err.message || "Failed to load session data")
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [sessionId])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <DashboardEditorialShell
          animateEnter={false}
          contentClassName="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24"
        >
          <Loader2 className="h-9 w-9 animate-spin text-accent" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Loading session results…
          </p>
        </DashboardEditorialShell>
      </ProtectedRoute>
    )
  }

  if (error || !session) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <DashboardEditorialShell
          animateEnter={false}
          contentClassName="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center"
        >
          <div className="space-y-2">
            <p className="eyebrow text-destructive">Unable to load</p>
            <h1 className="display text-2xl text-foreground md:text-3xl">{error || "Session not found"}</h1>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-accent px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground hover:bg-accent-deep"
          >
            Back to dashboard
          </Button>
        </DashboardEditorialShell>
      </ProtectedRoute>
    )
  }

  const candidateName = String(session.candidateName ?? session.candidate_name ?? "Candidate")
  const assessmentTitle = session.assessment?.jobTitle || session.assessment?.role || "Assessment"

  const displayName = candidateName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

  const submittedLabel =
    session.endedAt &&
    `Submitted ${new Date(session.endedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`

  const durationLabel =
    session.startedAt && session.endedAt
      ? (() => {
          const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
          const mm = Math.floor(ms / 60000)
          const ss = Math.floor((ms % 60000) / 1000)
          return `${mm}:${String(ss).padStart(2, "0")}`
        })()
      : null

  return (
    <ProtectedRoute requiredRole="recruiter">
      <DashboardEditorialShell animateEnter={false} contentClassName="space-y-10">
        <div className="space-y-6">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 transition-colors hover:border-hairline hover:bg-muted/30 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <span className="text-muted-foreground/35">/</span>
            <span className="truncate max-w-[200px]">{assessmentTitle}</span>
            <span className="text-muted-foreground/35">/</span>
            <span className="truncate font-medium text-foreground max-w-[220px]">{displayName}</span>
          </nav>

          <div className="flex flex-col gap-8 border-b border-hairline pb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="flex min-w-0 items-start gap-5">
              <EditorialAvatarInitials name={displayName} size="lg" className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="eyebrow">Session results</p>
                  <h1 className="display text-[1.85rem] leading-[1.08] tracking-[-0.02em] text-foreground sm:text-3xl md:text-[2.35rem]">
                    {displayName}
                  </h1>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    Completed
                  </span>
                  <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{assessmentTitle}</span>
                    {(submittedLabel || durationLabel) && (
                      <>
                        <span className="text-muted-foreground/40"> · </span>
                        <span>
                          {[submittedLabel, durationLabel ? `Duration ${durationLabel}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 lg:pt-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/report/${sessionId}`)}
                className="gap-2 rounded-full border-hairline bg-card font-mono text-[11px] font-semibold uppercase tracking-[0.14em] hover:bg-muted/40"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                type="button"
                onClick={() => router.push(`/dashboard/report/${sessionId}`)}
                className="gap-2 rounded-full bg-accent px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground shadow-[0_10px_30px_-10px_hsl(var(--accent)/0.55)] hover:bg-accent-deep"
              >
                Full report
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <SessionDetailView
          session={session}
          submissions={submissions}
          aiInteractions={aiInteractions}
          videoChunks={videoChunks}
          violations={violations}
          riskScore={riskScore}
          agentInsights={agentInsights}
          isCandidateView={false}
        />
      </DashboardEditorialShell>
    </ProtectedRoute>
  )
}
