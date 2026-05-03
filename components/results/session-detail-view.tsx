"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, AlertTriangle, Video, Monitor, Code, User, CheckCircle, MessageSquare, Bot, UserCircle, ExternalLink } from 'lucide-react'
import { API_BASE_URL } from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { logger } from '@/lib/logger'

interface SessionDetailViewProps {
  session: any
  submissions: any[]
  aiInteractions: any[]
  videoChunks?: any[] | null
  violations: any[]
  riskScore: number | null
  agentInsights?: {
    watcher: any;
    extractor: any;
    sanity: any;
    judge?: any; // LLM judge: strengths, weaknesses, ai_usage_narrative, candidate_fit_summary
    geminiVideoAnalysis?: {
      summary: string;
      timeOnTask: string;
      toolsObserved: string[];
      suspiciousActivity: string[];
      codingBehavior: string;
      keyMoments: Array<{ timestamp: string; observation: string }>;
      overallVerdict: 'focused' | 'somewhat_distracted' | 'distracted';
      confidence: 'high' | 'medium' | 'low';
      framesAnalyzed: number;
      totalChunks: number;
    } | null;
    metrics?: {
      promptQuality: number;
      selfReliance: number;
      promptIQ?: number;
      promptCount: number;
      copyCount: number;
      applyCount?: number;
      totalTokens?: number;
      modelSwitches?: number;
      modelBreakdown?: Array<{
        model: string;
        promptCount: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        avgLatencyMs: number;
      }>;
    };
  } | null
  isCandidateView?: boolean // If true, hide recruiter-specific information
}

export function SessionDetailView({
  session,
  submissions,
  aiInteractions,
  videoChunks,
  violations,
  riskScore,
  agentInsights,
  isCandidateView = false
}: SessionDetailViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'chat-history' | 'agent-insights' | 'recordings' | 'my-insights' | 'code'>('overview')
  const [chatSubTab, setChatSubTab] = useState<'conversation' | 'code-actions'>('conversation')
  const [selectedCodeFile, setSelectedCodeFile] = useState<string | null>(null)

  // Parse finalCode: could be JSON { path: content } map (IDE) or plain string (legacy)
  const parsedFiles = useMemo<Record<string, string> | null>(() => {
    const raw = session?.finalCode
    if (!raw || typeof raw !== 'string') return null
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, string>
    } catch { /* not JSON */ }
    return null  // plain string — handled separately
  }, [session?.finalCode])
  
  // Normalize videoChunks to always be an array — memoized so useEffect deps are stable
  const normalizedVideoChunks = useMemo(
    () => (Array.isArray(videoChunks) ? videoChunks : []),
    [videoChunks]
  )
  
  // Filter test results for candidates - only show visible test cases
  const filterTestResultsForCandidate = (testResults: any): any => {
    if (!testResults) return null
    
    // If testResults is an array
    if (Array.isArray(testResults)) {
      // Filter out hidden test cases
      return testResults.filter((test: any) => {
        // Show test if it's not marked as hidden
        return test.hidden !== true && test.isHidden !== true
      })
    }
    
    // If testResults is an object
    if (typeof testResults === 'object') {
      // If it has a 'tests' or 'testCases' array
      if (testResults.tests && Array.isArray(testResults.tests)) {
        return {
          ...testResults,
          tests: testResults.tests.filter((test: any) => 
            test.hidden !== true && test.isHidden !== true
          )
        }
      }
      if (testResults.testCases && Array.isArray(testResults.testCases)) {
        return {
          ...testResults,
          testCases: testResults.testCases.filter((test: any) => 
            test.hidden !== true && test.isHidden !== true
          )
        }
      }
      
      // If it has 'visible' property, use that
      if (testResults.visible) {
        return { visible: testResults.visible }
      }
      
      // If it has separate visible and hidden arrays
      if (testResults.visibleTests || testResults.publicTests) {
        return {
          visible: testResults.visibleTests || testResults.publicTests || [],
          // Don't include hidden tests
        }
      }
      
      // For candidates, only return visible/public test information
      // Remove any hidden test data
      const filtered: any = {}
      for (const [key, value] of Object.entries(testResults)) {
        // Skip hidden test cases
        if (key.toLowerCase().includes('hidden')) continue
        if (typeof value === 'object' && value !== null && Array.isArray(value)) {
          // Filter array items that are marked as hidden
          filtered[key] = (value as any[]).filter((item: any) => 
            item.hidden !== true && item.isHidden !== true
          )
        } else {
          filtered[key] = value
        }
      }
      return filtered
    }
    
    // Return as-is if we can't determine structure (fallback)
    return testResults
  }
  
  // Determine if this is a coding challenge (not IDE challenge)
  // IDE challenges have templateFiles, coding challenges don't
  // Leetcode-style = no templateId on the assessment (IDE sessions have a templateId)
  const isLeetcodeStyle = useMemo(() => {
    return !session?.assessment?.templateId
  }, [session])
  // Blob URLs created from concatenated chunks — set on <video src>
  const [webcamBlobUrl, setWebcamBlobUrl] = useState<string | null>(null)
  const [screenshareBlobUrl, setScreenshareBlobUrl] = useState<string | null>(null)
  // Loading progress state for each stream
  const [webcamLoading, setWebcamLoading] = useState<{ total: number; done: number } | null>(null)
  const [screenshareLoading, setScreenshareLoading] = useState<{ total: number; done: number } | null>(null)
  // Refs track the *latest* blob URL for cleanup-on-unmount only.
  // Using state values directly in a cleanup effect causes premature revocation.
  const webcamBlobRef = useRef<string | null>(null)
  const screenshareBlobRef = useRef<string | null>(null)

  // Filter submissions for recruiter view: only show coding assessments
  // A coding assessment submission must have:
  // - code (actual code submission), OR
  // - (problemId AND language), OR
  // - testResults (test results from code execution)
  const filteredSubmissions = useMemo(() => {
    if (isCandidateView) {
      // Candidate view: show all submissions
      return submissions
    }
    
    // Recruiter view: filter to only show submissions with coding assessment data
    return submissions.filter((submission: any) => {
      // Check if submission has coding assessment indicators
      const hasCode = submission.code && typeof submission.code === 'string' && submission.code.trim().length > 0
      const hasLanguage = submission.language && typeof submission.language === 'string' && submission.language.trim().length > 0
      const hasProblemId = (submission.problemId && submission.problemId.toString().trim().length > 0) || 
                          (submission.problem_id && submission.problem_id.toString().trim().length > 0)
      const hasTestResults = submission.testResults && (
        (Array.isArray(submission.testResults) && submission.testResults.length > 0) ||
        (typeof submission.testResults === 'object' && Object.keys(submission.testResults).length > 0)
      )
      
      // Include submission if it's a coding assessment:
      // 1. Has actual code submitted
      // 2. Has both problemId and language (indicating a coding problem)
      // 3. Has test results (indicating code was executed)
      return hasCode || (hasProblemId && hasLanguage) || hasTestResults
    })
  }, [submissions, isCandidateView])

  // Calculate overall score based on filtered submissions
  const totalScore = filteredSubmissions.reduce((sum, s) => sum + (s.score || 0), 0)
  const maxScore = filteredSubmissions.length * 100
  // For IDE/container sessions there are no submission records — fall back to the
  // agent extractor's behaviorScore (0-100) so the recruiter sees a real number.
  const agentBehaviorScore = agentInsights?.extractor?.behaviorScore
    ?? agentInsights?.extractor?.overallScore
    ?? null
  // isIdeSession: true if containerUrl present, or if assessment has a templateId (IDE-type),
  // or if extractor has overallScore (meaning analysis ran on an IDE session)
  const isIdeSession = !!(
    session?.containerUrl || session?.container_url ||
    session?.assessment?.templateId ||
    agentInsights?.extractor?.overallScore !== undefined
  )
  const percentageScore = maxScore > 0
    ? Math.round((totalScore / maxScore) * 100)
    : (isIdeSession && agentBehaviorScore !== null ? agentBehaviorScore : 0)
  // For IDE sessions pending analysis, don't show Failed — show Pending instead
  const isPendingAnalysis = isIdeSession && maxScore === 0 && agentBehaviorScore === null
  const passed = percentageScore >= 70 // 70% passing threshold

  // Fetch all chunks in parallel, concatenate into a single Blob, set as video src.
  // This gives smooth, seek-friendly playback — the browser buffers it like a regular file.
  useEffect(() => {
    if (activeTab !== 'recordings' || normalizedVideoChunks.length === 0) return

    let cancelled = false

    const loadStream = async (
      streamType: 'webcam' | 'screenshare',
      setLoading: React.Dispatch<React.SetStateAction<{ total: number; done: number } | null>>,
      setBlobUrl: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
      const chunks = normalizedVideoChunks
        .filter(c => c.streamType === streamType || (!c.streamType && c.url?.includes(`/${streamType}/`)))
        .sort((a: any, b: any) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0))

      if (chunks.length === 0) return

      setLoading({ total: chunks.length, done: 0 })

      // Fetch all chunks in parallel so total download time = slowest single chunk
      const buffers = await Promise.all(
        chunks.map(async (chunk: any) => {
          try {
            const url = chunk.url?.startsWith('http') ? chunk.url : `${API_BASE_URL}${chunk.url}`
            const r = await fetch(url)
            if (!r.ok) {
              console.warn(`${streamType}: chunk ${chunk.chunkIndex} → ${r.status}, skipping`)
              return null
            }
            const buf = await r.arrayBuffer()
            if (!cancelled) setLoading(prev => prev ? { ...prev, done: prev.done + 1 } : null)
            return buf
          } catch (e) {
            console.warn(`${streamType}: failed to fetch chunk ${chunk.chunkIndex}:`, e)
            return null
          }
        })
      )

      if (cancelled) return

      const valid = buffers.filter(Boolean) as ArrayBuffer[]
      if (valid.length === 0) { setLoading(null); return }

      // Concatenate all valid buffers into a single contiguous WebM file
      const totalBytes = valid.reduce((s, b) => s + b.byteLength, 0)
      const merged = new Uint8Array(totalBytes)
      let offset = 0
      for (const buf of valid) {
        merged.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
      }

      const blob = new Blob([merged], { type: 'video/webm' })
      const newUrl = URL.createObjectURL(blob)
      console.log(`✅ ${streamType}: created blob (${(totalBytes / 1024 / 1024).toFixed(1)} MB) from ${valid.length}/${chunks.length} chunks`)

      // Revoke old blob URL for this stream before setting the new one
      const oldRef = streamType === 'webcam' ? webcamBlobRef : screenshareBlobRef
      if (oldRef.current) { URL.revokeObjectURL(oldRef.current) }
      oldRef.current = newUrl

      setBlobUrl(newUrl)
      setLoading(null)
    }

    loadStream('webcam', setWebcamLoading, setWebcamBlobUrl)
    loadStream('screenshare', setScreenshareLoading, setScreenshareBlobUrl)

    return () => {
      cancelled = true
    }
  }, [activeTab, normalizedVideoChunks])

  // Revoke blob URLs only on true component unmount (empty deps = runs once)
  useEffect(() => {
    return () => {
      if (webcamBlobRef.current) URL.revokeObjectURL(webcamBlobRef.current)
      if (screenshareBlobRef.current) URL.revokeObjectURL(screenshareBlobRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadReport = () => {
    const sessionId = session?.id;
    if (sessionId) router.push(`/dashboard/report/${sessionId}`);
  }

  // Chat message count
  const chatCount = aiInteractions.filter(i => i.promptText || i.responseText || i.eventType === 'prompt_sent' || i.eventType === 'response_received').length

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8" /></svg>
            Overview
          </button>
          {/* Submissions Tab - Only show for leetcode-style */}
          {isLeetcodeStyle && (
            <button
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'submissions'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Submissions {filteredSubmissions.length > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px]">{filteredSubmissions.length}</span>}
            </button>
          )}
          {/* Chat History Tab - Show full conversation */}
          <button
            onClick={() => setActiveTab('chat-history')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chat-history'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat History {chatCount > 0 && <span className="rounded-full bg-muted px-1.5 text-[10px]">{chatCount}</span>}
          </button>
          {/* Agent Insights Tab - Only for recruiters, shows detailed agent analysis */}
          {!isCandidateView && agentInsights && (
            <button
              onClick={() => setActiveTab('agent-insights')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'agent-insights'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Agent Insights
            </button>
          )}
          {/* My Insights Tab - Only for candidates, shows simplified feedback */}
          {isCandidateView && agentInsights && (
            <button
              onClick={() => setActiveTab('my-insights')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'my-insights'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              My Insights
            </button>
          )}
          {/* Code Tab — shows candidate's final workspace files (IDE challenge sessions) */}
          {!isCandidateView && session?.finalCode && (
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'code'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              Code {parsedFiles ? `(${Object.keys(parsedFiles).length} files)` : ''}
            </button>
          )}
          {/* Recordings Tab - Only for recruiter assessments */}
          {!isCandidateView && (
          <button
            onClick={() => setActiveTab('recordings')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'recordings'
                ? 'text-foreground border-b-2 border-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            Recordings {normalizedVideoChunks.length > 0 && (() => {
              const streamCount = [
                normalizedVideoChunks.some(c => c.streamType === 'webcam'),
                normalizedVideoChunks.some(c => c.streamType === 'screenshare')
              ].filter(Boolean).length || 1
              return <span className="rounded-full bg-muted px-1.5 text-[10px]">{streamCount}</span>
            })()}
          </button>
          )}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (() => {
        // ── derived helpers ──────────────────────────────────────────────────
        const durationMs = session.startedAt && session.endedAt
          ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
          : null
        const durationFmt = durationMs != null
          ? `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}`
          : '—'
        const submittedFmt = session.endedAt
          ? new Date(session.endedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—'

        const metrics   = agentInsights?.metrics
        const judge     = agentInsights?.judge
        const sanity    = agentInsights?.sanity
        const extractor = agentInsights?.extractor
        const watcher   = agentInsights?.watcher

        // tab-switch violations count (prefer watcher timeline tab events, fall back to violations prop)
        const tabSwitchCount = violations.length

        // Integrity status
        const redFlagCount  = sanity?.redFlags?.length ?? 0
        const isVerified    = redFlagCount === 0

        // Summary text (judge > extractor > nothing)
        const summaryText = judge?.candidate_fit_summary || judge?.ai_usage_narrative || extractor?.analysisExplanation || null

        // KEY FINDINGS — derive up to 3 from judge strengths/weaknesses + integrity
        type Finding = { type: 'strength'|'concern'|'integrity'; title: string; body: string }
        const findings: Finding[] = []
        if (judge?.strengths?.length) {
          const s = judge.strengths[0]
          findings.push({ type: 'strength', title: typeof s === 'string' ? s : s.title || 'Strength', body: typeof s === 'string' ? '' : (s.description || '') })
        }
        if (judge?.weaknesses?.length) {
          const w = judge.weaknesses[0]
          findings.push({ type: 'concern', title: typeof w === 'string' ? w : w.title || 'Concern', body: typeof w === 'string' ? '' : (w.description || '') })
        }
        // Always add integrity finding
        findings.push({
          type: 'integrity',
          title: isVerified ? 'Original work, no flags' : `${redFlagCount} flag${redFlagCount !== 1 ? 's' : ''} detected`,
          body: isVerified
            ? `No plagiarism, anomalies or red flags detected${watcher?.timeline?.length ? ` across ${watcher.timeline.length} timeline events` : ''}. Single-session, focused work.`
            : `${redFlagCount} red flag${redFlagCount !== 1 ? 's' : ''} found during analysis.`
        })

        // Evidence items
        const tools = session.toolResources as Record<string, { url: string; viewUrl?: string }> | null
        const docsEntry = tools?.docs ?? (session.docsFileUrl ? { url: session.docsFileUrl, viewUrl: session.docsFileUrl?.replace(/\/edit.*$/, '/preview') } : null)

        // Agent verdict scores
        const watcherScore   = watcher?.riskScore ?? riskScore ?? null
        const analyzerScore  = extractor?.behaviorScore ?? extractor?.overallScore ?? null
        const riskAgentScore = sanity?.riskScore ?? null

        const findingBadgeClass = (type: Finding['type']) => {
          if (type === 'strength')  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
          if (type === 'concern')   return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
          return 'bg-teal-500/15 text-teal-400 border-teal-500/20'
        }
        const findingIconClass = (type: Finding['type']) => {
          if (type === 'strength')  return 'bg-emerald-500/15 text-emerald-400'
          if (type === 'concern')   return 'bg-amber-500/15 text-amber-400'
          return 'bg-teal-500/15 text-teal-400'
        }
        const findingIcon = (type: Finding['type']) => {
          if (type === 'strength')  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          if (type === 'concern')   return <AlertTriangle className="h-4 w-4" />
          return <CheckCircle className="h-4 w-4" />
        }

        const agentIcon = (type: 'watcher'|'analyzer'|'risk') => {
          if (type === 'watcher')  return <Monitor className="h-4 w-4" />
          if (type === 'analyzer') return <Code className="h-4 w-4" />
          return <AlertTriangle className="h-4 w-4" />
        }
        const agentScoreColor = (score: number | null, invert = false) => {
          if (score == null) return 'text-muted-foreground'
          if (invert) {
            // lower = better (risk score)
            if (score <= 20) return 'text-emerald-400'
            if (score <= 50) return 'text-amber-400'
            return 'text-red-400'
          }
          if (score >= 70) return 'text-emerald-400'
          if (score >= 40) return 'text-amber-400'
          return 'text-red-400'
        }

        return (
          <div className="space-y-6">

            {/* ── ASSESSMENT RESULT card ─────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card/40 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground/70 mb-1">ASSESSMENT RESULT</p>
                  <p className="text-sm text-muted-foreground">
                    {isIdeSession ? 'AI-assessed behaviour & integrity score' : 'Points-based coding score'}
                  </p>
                </div>
                {!isPendingAnalysis && (
                  <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    passed
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {passed ? 'Above threshold' : 'Below threshold'} · pass at 70 %
                  </div>
                )}
              </div>

              {/* Giant score */}
              <div className="mb-8">
                <span className="text-[96px] font-bold leading-none text-foreground tracking-tight">{percentageScore}</span>
                <span className="text-4xl text-muted-foreground ml-1">%</span>
              </div>

              {/* Gradient progress bar with PASS marker */}
              <div className="relative mb-8">
                <div className="h-2 rounded-full bg-muted overflow-visible relative">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${percentageScore}%`, background: 'linear-gradient(to right, #7c3aed, #a78bfa)' }}
                  />
                </div>
                {/* PASS marker at 70% */}
                <div className="absolute top-0" style={{ left: '70%' }}>
                  <div className="h-2 w-px bg-muted-foreground/60" />
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/60">PASS</span>
                </div>
              </div>

              {/* Summary text */}
              {summaryText && (
                <p className="text-sm text-muted-foreground leading-relaxed">{summaryText}</p>
              )}
            </div>

            {/* ── 4 STAT CARDS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Duration */}
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60 mb-3">DURATION</p>
                <p className="text-2xl font-bold text-foreground">{durationFmt}</p>
                <p className="text-xs text-muted-foreground mt-1">Submitted {submittedFmt}</p>
              </div>

              {/* AI Prompts */}
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60 mb-3">AI PROMPTS</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.promptCount ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[
                    metrics?.modelSwitches != null ? `${metrics.modelSwitches + 1} models` : null,
                    metrics?.totalTokens != null ? `${metrics.totalTokens.toLocaleString()} tokens` : null
                  ].filter(Boolean).join(' · ') || 'No AI usage'}
                </p>
              </div>

              {/* Tab Switches */}
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60 mb-3">TAB SWITCHES</p>
                <p className="text-2xl font-bold text-foreground">{tabSwitchCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tabSwitchCount === 0 ? 'Stayed in assessment' : 'Left assessment'}
                </p>
              </div>

              {/* Integrity */}
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60 mb-3">INTEGRITY</p>
                {sanity ? (
                  <>
                    <p className={`text-2xl font-bold flex items-center gap-2 ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <span className="h-2 w-2 rounded-full bg-current flex-shrink-0" />
                      {isVerified ? 'Verified' : 'Flagged'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{isVerified ? 'No flags raised' : `${redFlagCount} flag${redFlagCount !== 1 ? 's' : ''} raised`}</p>
                  </>
                ) : (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* ── KEY FINDINGS ──────────────────────────────────────────── */}
            {!isCandidateView && findings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-foreground">KEY FINDINGS</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{findings.length}</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('agent-insights')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    See full agent breakdown <span aria-hidden>→</span>
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {findings.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card/40 p-5">
                      <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${findingIconClass(f.type)}`}>
                        {findingIcon(f.type)}
                      </div>
                      <div className="mb-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] ${findingBadgeClass(f.type)}`}>
                          {f.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
                      {f.body && <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── REVIEW THE EVIDENCE ───────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-foreground mb-4">REVIEW THE EVIDENCE</p>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Watch Recording */}
                {!isCandidateView && normalizedVideoChunks.length > 0 && (
                  <button
                    onClick={() => setActiveTab('recordings')}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-5 text-left hover:bg-card/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Watch Recording</p>
                        <p className="text-xs text-muted-foreground">Webcam + screen share · {durationFmt}</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                  </button>
                )}

                {/* Read AI Chat */}
                {aiInteractions.filter(i => i.promptText || i.responseText).length > 0 && (
                  <button
                    onClick={() => setActiveTab('chat-history')}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-5 text-left hover:bg-card/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Read AI Chat</p>
                        <p className="text-xs text-muted-foreground">{aiInteractions.filter(i => i.promptText || i.responseText).length} messages exchanged with AI</p>
                      </div>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                  </button>
                )}

                {/* View Submitted Doc */}
                {!isCandidateView && docsEntry && (
                  <a
                    href={docsEntry.viewUrl || docsEntry.url.replace(/\/edit.*$/, '/preview')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-5 text-left hover:bg-card/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">View Submitted Doc</p>
                        <p className="text-xs text-muted-foreground">Read-only · locked at submit</p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                )}
              </div>
            </div>

            {/* ── AI AGENT VERDICTS ─────────────────────────────────────── */}
            {!isCandidateView && agentInsights && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-foreground">AI AGENT VERDICTS</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">3 agents</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('agent-insights')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View detailed analysis →
                  </button>
                </div>
                <div className="rounded-2xl border border-border bg-card/40 p-6">
                  <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border gap-6 md:gap-0">
                    {/* Agent 6: Watcher */}
                    <div className="md:pr-6">
                      <p className="text-[10px] text-muted-foreground/60 mb-1">Agent 6</p>
                      <p className="text-sm font-semibold text-foreground mb-3">Watcher</p>
                      <p className={`text-3xl font-bold ${agentScoreColor(watcherScore, true)}`}>
                        {watcherScore ?? '—'}<span className="text-base text-muted-foreground font-normal"> /100</span>
                      </p>
                      <p className={`text-xs mt-1 ${agentScoreColor(watcherScore, true)}`}>
                        {watcherScore == null ? '—' : watcherScore <= 20 ? 'No risk detected' : watcherScore <= 50 ? 'Some risk' : 'High risk'}
                      </p>
                    </div>
                    {/* Agent 7: Analyzer */}
                    <div className="md:px-6 pt-4 md:pt-0">
                      <p className="text-[10px] text-muted-foreground/60 mb-1">Agent 7</p>
                      <p className="text-sm font-semibold text-foreground mb-3">Analyzer</p>
                      <p className={`text-3xl font-bold ${agentScoreColor(analyzerScore)}`}>
                        {analyzerScore ?? '—'}<span className="text-base text-muted-foreground font-normal"> /100</span>
                      </p>
                      <p className={`text-xs mt-1 ${agentScoreColor(analyzerScore)}`}>
                        {analyzerScore == null ? '—' : analyzerScore >= 70 ? 'Strong' : analyzerScore >= 40 ? 'Adequate' : 'Weak'}
                      </p>
                    </div>
                    {/* Agent 8: Risk Assessor */}
                    <div className="md:pl-6 pt-4 md:pt-0">
                      <p className="text-[10px] text-muted-foreground/60 mb-1">Agent 8</p>
                      <p className="text-sm font-semibold text-foreground mb-3">Risk Assessor</p>
                      <p className={`text-3xl font-bold ${agentScoreColor(riskAgentScore, true)}`}>
                        {riskAgentScore ?? '—'}<span className="text-base text-muted-foreground font-normal"> /100</span>
                      </p>
                      <p className={`text-xs mt-1 ${agentScoreColor(riskAgentScore, true)}`}>
                        {riskAgentScore == null ? '—' : riskAgentScore <= 20 ? 'No risk detected' : riskAgentScore <= 50 ? 'Some risk' : 'High risk'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/50 mt-3 text-center">
                  All technical detail — timelines, code-quality metrics, model usage, plagiarism checks — lives under the{' '}
                  <button onClick={() => setActiveTab('agent-insights')} className="text-muted-foreground hover:text-foreground underline underline-offset-2">Agent Insights</button> tab.
                </p>
              </div>
            )}

          </div>
        )
      })()}

      {activeTab === 'submissions' && isLeetcodeStyle && (
        <div className="space-y-6">
          {filteredSubmissions.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="p-6 text-muted-foreground text-center">
                {!isCandidateView && submissions.length > 0 
                  ? 'No coding assessment submissions found.' 
                  : 'No submissions yet.'}
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map((submission, index) => (
              <Card key={index} className="border-border bg-background">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Submission #{index + 1}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-emerald-500/20 text-emerald-400">
                        {submission.language || 'N/A'}
                      </Badge>
                      <Badge className={
                        (submission.score || 0) >= 70 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : (submission.score || 0) >= 40
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }>
                        Score: {submission.score || 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <span>Problem ID: {submission.problemId ?? submission.problem_id ?? 'N/A'}</span>
                    <span className="mx-2">•</span>
                    <span>
                      Submitted: {submission.submittedAt || submission.submitted_at 
                        ? new Date(submission.submittedAt || submission.submitted_at).toLocaleString()
                        : 'N/A'}
                    </span>
                    {submission.testResults && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          {isCandidateView ? (
                            (() => {
                              const filteredResults = filterTestResultsForCandidate(submission.testResults)
                              const visibleTests = Array.isArray(filteredResults) 
                                ? filteredResults 
                                : filteredResults?.tests || filteredResults?.testCases || filteredResults?.visible || []
                              const visiblePassed = Array.isArray(visibleTests) 
                                ? visibleTests.filter((test: any) => test.status === 'passed' || test.passed === true).length
                                : 0
                              const visibleTotal = Array.isArray(visibleTests) ? visibleTests.length : 0
                              return `Visible Tests: ${visiblePassed}/${visibleTotal} passed`
                            })()
                          ) : (
                            `Tests: ${submission.passedTests || 0}/${submission.totalTests || 0} passed`
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Submitted Code */}
                  <div className="mt-4">
                    <h3 className="text-foreground font-semibold mb-2">Submitted Code</h3>
                    <div className="relative">
                      <pre className="bg-card border border-border rounded-lg p-4 overflow-x-auto">
                        <code className="text-sm text-foreground/80 font-mono whitespace-pre">
                          {submission.code || 'No code submitted'}
                        </code>
                      </pre>
                    </div>
                  </div>
                  
                  {/* Test Results - Filtered for candidates */}
                  {submission.testResults && (
                    <div className="mt-4">
                      <h3 className="text-foreground font-semibold mb-2">Test Results</h3>
                      {isCandidateView ? (
                        // Candidate view: Only show visible test cases
                        (() => {
                          const filteredResults = filterTestResultsForCandidate(submission.testResults)
                          const visibleTestCount = Array.isArray(filteredResults) 
                            ? filteredResults.length 
                            : filteredResults?.tests?.length || filteredResults?.testCases?.length || filteredResults?.visible?.length || 0
                          
                          return (
                            <div className="space-y-3">
                              <div className="bg-card border border-border rounded-lg p-4">
                                {filteredResults && (Array.isArray(filteredResults) || filteredResults.tests || filteredResults.testCases || filteredResults.visible) ? (
                                  <div className="space-y-2">
                                    {Array.isArray(filteredResults) ? (
                                      filteredResults.map((test: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded bg-muted/50 border border-border">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-foreground">
                                              Test Case {idx + 1}
                                            </span>
                                            <Badge className={
                                              test.status === 'passed' || test.passed === true
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }>
                                              {test.status === 'passed' || test.passed === true ? 'Passed' : 'Failed'}
                                            </Badge>
                                          </div>
                                          {test.input && (
                                            <div className="mt-2">
                                              <span className="text-xs text-muted-foreground">Input: </span>
                                              <code className="text-xs text-foreground/80 bg-card px-2 py-1 rounded">
                                                {typeof test.input === 'object' ? JSON.stringify(test.input) : test.input}
                                              </code>
                                            </div>
                                          )}
                                          {test.expected && (
                                            <div className="mt-2">
                                              <span className="text-xs text-muted-foreground">Expected: </span>
                                              <code className="text-xs text-foreground/80 bg-card px-2 py-1 rounded">
                                                {typeof test.expected === 'object' ? JSON.stringify(test.expected) : test.expected}
                                              </code>
                                            </div>
                                          )}
                                          {test.output && (
                                            <div className="mt-2">
                                              <span className="text-xs text-muted-foreground">Your Output: </span>
                                              <code className="text-xs text-foreground/80 bg-card px-2 py-1 rounded">
                                                {typeof test.output === 'object' ? JSON.stringify(test.output) : test.output}
                                              </code>
                                            </div>
                                          )}
                                          {test.message && (
                                            <p className="text-xs text-muted-foreground mt-2">{test.message}</p>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <pre className="text-sm text-foreground/80 whitespace-pre-wrap">
                                        {JSON.stringify(filteredResults, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">
                                    No visible test results available
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/70">
                                Showing {visibleTestCount} visible test case{visibleTestCount !== 1 ? 's' : ''}. 
                                Hidden test cases are not shown.
                              </p>
                            </div>
                          )
                        })()
                      ) : (
                        // Recruiter view: Show all test results
                        <div className="bg-card border border-border rounded-lg p-4">
                          <pre className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {JSON.stringify(submission.testResults, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Chat History Tab — two sub-tabs: Conversation + Code Actions */}
      {activeTab === 'chat-history' && (() => {
        const convMessages = aiInteractions
          .filter(i => i.eventType === 'prompt_sent' || i.eventType === 'response_received' || i.promptText || i.responseText)
          .sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime())

        const codeActions = aiInteractions
          .filter(i => ['copy', 'code_copied', 'code_copied_from_ai', 'apply', 'code_applied', 'code_modified'].includes(i.eventType))
          .sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime())

        const actionLabel = (evt: string) => {
          if (['copy','code_copied','code_copied_from_ai'].includes(evt)) return { label: 'Copied from AI', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
          if (['apply','code_applied'].includes(evt)) return { label: 'Applied to editor', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' }
          if (evt === 'code_modified') return { label: 'Manually edited', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
          return { label: evt, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border' }
        }

        return (
          <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
            {/* Sub-tab bar */}
            <div className="flex items-center gap-0 border-b border-border px-4 pt-3">
              <button
                onClick={() => setChatSubTab('conversation')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  chatSubTab === 'conversation'
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Conversation
                {convMessages.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px]">{convMessages.length}</span>
                )}
              </button>
              <button
                onClick={() => setChatSubTab('code-actions')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  chatSubTab === 'code-actions'
                    ? 'text-foreground border-foreground'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Code Actions
                {codeActions.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px]">{codeActions.length}</span>
                )}
              </button>
            </div>

            {/* ── Conversation sub-tab ─────────────────────────────────── */}
            {chatSubTab === 'conversation' && (
              <div className="p-4">
                {convMessages.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No AI conversations captured</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Prompts sent during the session will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {convMessages.map((interaction, index) => {
                      const isPrompt   = interaction.eventType === 'prompt_sent' || !!interaction.promptText
                      const isResponse = interaction.eventType === 'response_received' || !!interaction.responseText
                      const ts = new Date(interaction.timestamp || interaction.createdAt || Date.now())

                      return (
                        <div key={index} className="flex flex-col gap-2">
                          {/* Candidate bubble */}
                          {isPrompt && interaction.promptText && (
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                <UserCircle className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-muted/60 rounded-xl rounded-tl-none p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-emerald-400">Candidate</span>
                                    <span className="text-[10px] text-muted-foreground/60">{ts.toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{interaction.promptText}</p>
                                  {interaction.model && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-2">Model: {interaction.model}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* AI bubble */}
                          {isResponse && interaction.responseText && (
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-card border border-border rounded-xl rounded-tl-none p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-violet-400">AI Assistant</span>
                                      {interaction.model && (
                                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-400">{interaction.model}</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/60">{ts.toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{interaction.responseText}</p>
                                  {(interaction.promptTokens || interaction.completionTokens) && (
                                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                                      {[
                                        interaction.promptTokens   ? `${interaction.promptTokens} in`  : null,
                                        interaction.completionTokens ? `${interaction.completionTokens} out` : null,
                                      ].filter(Boolean).join(' · ')} tokens
                                      {interaction.latencyMs ? ` · ${interaction.latencyMs}ms` : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Inline code snippet */}
                          {interaction.codeSnippet && (
                            <div className="ml-11 rounded-lg border border-border bg-background/60 p-3">
                              <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-semibold tracking-wide">CODE SNIPPET</p>
                              <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap overflow-x-auto">{interaction.codeSnippet}</pre>
                              {interaction.codeLineNumber && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1">Line {interaction.codeLineNumber}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Code Actions sub-tab ──────────────────────────────────── */}
            {chatSubTab === 'code-actions' && (
              <div className="p-4">
                {codeActions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Code className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No code actions recorded</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Copy, apply, and edit events will appear here.</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto pr-1">
                    {/* Summary strip */}
                    {(() => {
                      const copies = codeActions.filter(i => ['copy','code_copied','code_copied_from_ai'].includes(i.eventType)).length
                      const applies = codeActions.filter(i => ['apply','code_applied'].includes(i.eventType)).length
                      const edits = codeActions.filter(i => i.eventType === 'code_modified').length
                      return (
                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                          {copies > 0 && (
                            <span className="rounded-full border bg-amber-500/10 border-amber-500/20 px-3 py-1 text-xs text-amber-400">
                              {copies} cop{copies === 1 ? 'y' : 'ies'} from AI
                            </span>
                          )}
                          {applies > 0 && (
                            <span className="rounded-full border bg-violet-500/10 border-violet-500/20 px-3 py-1 text-xs text-violet-400">
                              {applies} applied to editor
                            </span>
                          )}
                          {edits > 0 && (
                            <span className="rounded-full border bg-emerald-500/10 border-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                              {edits} manual edit{edits === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      )
                    })()}

                    {/* Timeline */}
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-3">
                        {codeActions.map((action, i) => {
                          const { label, color, bg } = actionLabel(action.eventType)
                          const ts = new Date(action.timestamp || action.createdAt || Date.now())
                          const snippet = action.codeSnippet || action.code_snippet || ''
                          const lines = snippet ? snippet.split('\n').length : 0

                          return (
                            <div key={i} className="relative pl-8">
                              {/* dot */}
                              <div className={`absolute left-2 top-1.5 h-3 w-3 rounded-full border-2 border-background ${color.replace('text-', 'bg-').replace('-400', '-400')}`} />
                              <div className={`rounded-xl border p-4 ${bg}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-semibold ${color}`}>{label}</span>
                                  <span className="text-[10px] text-muted-foreground/60">{ts.toLocaleTimeString()}</span>
                                </div>
                                {lines > 0 && (
                                  <p className="text-xs text-muted-foreground mb-2">{lines} line{lines !== 1 ? 's' : ''} of code</p>
                                )}
                                {snippet && (
                                  <pre className="text-[11px] font-mono text-foreground/70 bg-background/50 rounded-lg p-2 whitespace-pre-wrap overflow-x-auto max-h-[120px] overflow-y-auto">
                                    {snippet.length > 400 ? snippet.slice(0, 400) + '\n…' : snippet}
                                  </pre>
                                )}
                                {action.codeLineNumber && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">at line {action.codeLineNumber}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Agent Insights Tab - Only for recruiters */}
      {activeTab === 'agent-insights' && !isCandidateView && agentInsights && (
        <div className="space-y-6">
          {/* Agent 6: Watcher - Real-time Monitoring */}
          {agentInsights.watcher && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-violet-400" />
                  Agent 6: Watcher
                  <Badge className="ml-2 bg-violet-500/20 text-violet-400">Monitoring Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score */}
                {agentInsights.watcher.riskScore !== undefined && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Risk Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.watcher.riskScore >= 70 ? 'text-red-400' :
                        agentInsights.watcher.riskScore >= 40 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {agentInsights.watcher.riskScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.watcher.riskScore} 
                      className={`h-2 ${
                        agentInsights.watcher.riskScore >= 70 ? 'bg-red-500/20' :
                        agentInsights.watcher.riskScore >= 40 ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}
                    />
                  </div>
                )}

                {/* Alerts */}
                {agentInsights.watcher.alerts && agentInsights.watcher.alerts.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Alerts ({agentInsights.watcher.alerts.length})
                    </h3>
                    <div className="space-y-2">
                      {agentInsights.watcher.alerts.map((alert: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          alert.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-violet-500/10 border-violet-500/30'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${
                                alert.severity === 'high' ? 'text-red-400' :
                                alert.severity === 'medium' ? 'text-amber-400' :
                                'text-violet-400'
                              }`}>
                                {alert.type?.replace(/_/g, ' ').toUpperCase() || 'Alert'}
                              </span>
                              <p className="text-foreground/80 text-sm mt-1">{alert.message}</p>
                            </div>
                            <Badge className={
                              alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-violet-500/20 text-violet-400'
                            }>
                              {alert.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {agentInsights.watcher.timeline && agentInsights.watcher.timeline.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Activity Timeline</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {agentInsights.watcher.timeline.map((event: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-card/60">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground/80 text-sm">{event.description || event.type}</p>
                            {event.timestamp && (
                              <p className="text-muted-foreground/70 text-xs mt-1">
                                {new Date(event.timestamp).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metrics */}
                {agentInsights.watcher.metrics && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(agentInsights.watcher.metrics).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">{key.replace(/_/g, ' ')}</div>
                          <div className="text-foreground text-lg font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {agentInsights.watcher.evidence && agentInsights.watcher.evidence.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Evidence</h3>
                    <div className="space-y-2">
                      {agentInsights.watcher.evidence.map((evidence: string, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-card/60 border border-border">
                          <p className="text-foreground/80 text-sm">{evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.watcher.explanation && (
                  <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <h3 className="text-violet-400 font-semibold mb-2">Analysis Explanation</h3>
                    <p className="text-foreground/80 text-sm">{agentInsights.watcher.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.watcher.confidence !== undefined && (
                  <div className="text-muted-foreground text-xs">
                    Confidence: {agentInsights.watcher.confidence}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent 7: Extractor - Code Analysis */}
          {agentInsights.extractor && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Code className="h-5 w-5 text-violet-400" />
                  Agent 7: Analyzer
                  <Badge className="ml-2 bg-violet-500/20 text-violet-400">Analysis Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Behavior Score */}
                {agentInsights.extractor.behaviorScore !== undefined && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Behavior Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'text-emerald-400' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {agentInsights.extractor.behaviorScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.extractor.behaviorScore} 
                      className="h-2"
                    />
                    <p className="text-muted-foreground/70 text-xs mt-2">
                      Higher score indicates better coding behavior and integration quality
                    </p>
                  </div>
                )}

                {/* Code Quality */}
                {agentInsights.extractor.codeQuality && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Code Quality Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {agentInsights.extractor.codeQuality.totalLines !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Total Lines</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.totalLines}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.nonEmptyLines !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Non-empty Lines</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.nonEmptyLines}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.comments !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Comments</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.comments}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.commentRatio !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Comment Ratio</div>
                          <div className="text-foreground text-lg font-semibold">
                            {Math.round(agentInsights.extractor.codeQuality.commentRatio * 100)}%
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.complexity && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Complexity</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.complexity}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.maxIndentation !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Max Indentation</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeQuality.maxIndentation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Code Integration */}
                {agentInsights.extractor.codeIntegration && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Code Integration Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {agentInsights.extractor.codeIntegration.modifications !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Modifications</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeIntegration.modifications}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.copies !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Copies</div>
                          <div className="text-foreground text-lg font-semibold">
                            {agentInsights.extractor.codeIntegration.copies}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.modificationRatio !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Modification Ratio</div>
                          <div className="text-foreground text-lg font-semibold">
                            {Math.round(agentInsights.extractor.codeIntegration.modificationRatio * 100)}%
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.codeIntegration.integrationQuality && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="text-muted-foreground text-xs mb-1">Integration Quality</div>
                          <div className={`text-lg font-semibold ${
                            agentInsights.extractor.codeIntegration.integrationQuality === 'good' ? 'text-emerald-400' :
                            agentInsights.extractor.codeIntegration.integrationQuality === 'fair' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {agentInsights.extractor.codeIntegration.integrationQuality.toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {agentInsights.extractor.patterns && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Detected Patterns</h3>
                    <div className="space-y-3">
                      {agentInsights.extractor.patterns.copyPastePatterns && agentInsights.extractor.patterns.copyPastePatterns.length > 0 && (
                        <div>
                          <h4 className="text-muted-foreground text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            Copy-Paste Patterns ({agentInsights.extractor.patterns.copyPastePatterns.length})
                          </h4>
                          <div className="space-y-2">
                            {agentInsights.extractor.patterns.copyPastePatterns.map((pattern: any, i: number) => (
                              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                <div className="text-foreground/80 text-sm space-y-1">
                                  {pattern.type && (
                                    <p><span className="text-muted-foreground">Type:</span> {pattern.type}</p>
                                  )}
                                  {pattern.description && (
                                    <p><span className="text-muted-foreground">Description:</span> {pattern.description}</p>
                                  )}
                                  {pattern.confidence !== undefined && (
                                    <p><span className="text-muted-foreground">Confidence:</span> {pattern.confidence}%</p>
                                  )}
                                  {pattern.location && (
                                    <p><span className="text-muted-foreground">Location:</span> {pattern.location}</p>
                                  )}
                                  {!pattern.type && !pattern.description && (
                                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(pattern, null, 2)}</pre>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.patterns.timingPatterns && (
                        <div>
                          <h4 className="text-muted-foreground text-sm mb-2">Timing Patterns</h4>
                          <div className="p-3 rounded-lg bg-card/60 border border-border">
                            <div className="text-foreground/80 text-sm space-y-2">
                              {typeof agentInsights.extractor.patterns.timingPatterns === 'object' ? (
                                Object.entries(agentInsights.extractor.patterns.timingPatterns).map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>{' '}
                                    <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <p>{String(agentInsights.extractor.patterns.timingPatterns)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {agentInsights.extractor.patterns.promptPatterns && (
                        <div>
                          <h4 className="text-muted-foreground text-sm mb-2">Prompt Patterns</h4>
                          <div className="p-3 rounded-lg bg-card/60 border border-border">
                            <div className="text-foreground/80 text-sm space-y-2">
                              {typeof agentInsights.extractor.patterns.promptPatterns === 'object' ? (
                                Object.entries(agentInsights.extractor.patterns.promptPatterns).map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>{' '}
                                    <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <p>{String(agentInsights.extractor.patterns.promptPatterns)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {agentInsights.extractor.skills && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Detected Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(agentInsights.extractor.skills).map(([skill, level]: [string, any]) => (
                        <Badge key={skill} className="bg-violet-500/20 text-violet-400">
                          {skill}: {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.extractor.explanation && (
                  <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <h3 className="text-violet-400 font-semibold mb-2">Analysis Explanation</h3>
                    <p className="text-foreground/80 text-sm">{agentInsights.extractor.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.extractor.confidence !== undefined && (
                  <div className="text-muted-foreground text-xs">
                    Confidence: {agentInsights.extractor.confidence}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent 8: Sanity - Risk Assessment */}
          {agentInsights.sanity && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Agent 8: Risk Assessor
                  <Badge className="ml-2 bg-red-500/20 text-red-400">Risk Agent</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score */}
                {agentInsights.sanity.riskScore !== undefined && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Risk Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.sanity.riskScore >= 70 ? 'text-red-400' :
                        agentInsights.sanity.riskScore >= 40 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {agentInsights.sanity.riskScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.sanity.riskScore} 
                      className={`h-2 ${
                        agentInsights.sanity.riskScore >= 70 ? 'bg-red-500/20' :
                        agentInsights.sanity.riskScore >= 40 ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}
                    />
                    <p className="text-muted-foreground/70 text-xs mt-2">
                      Higher score indicates higher risk of suspicious behavior
                    </p>
                  </div>
                )}

                {/* Red Flags */}
                {agentInsights.sanity.redFlags && agentInsights.sanity.redFlags.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      Red Flags ({agentInsights.sanity.redFlags.length})
                    </h3>
                    <div className="space-y-2">
                      {agentInsights.sanity.redFlags.map((flag: any, i: number) => (
                        <div key={i} className={`p-4 rounded-lg border ${
                          flag.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                          flag.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-violet-500/10 border-violet-500/30'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${
                                flag.severity === 'high' ? 'text-red-400' :
                                flag.severity === 'medium' ? 'text-amber-400' :
                                'text-violet-400'
                              }`}>
                                {flag.type?.replace(/_/g, ' ').toUpperCase() || 'Red Flag'}
                              </span>
                              <p className="text-foreground/80 text-sm mt-1">{flag.description}</p>
                            </div>
                            <Badge className={
                              flag.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              flag.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-violet-500/20 text-violet-400'
                            }>
                              {flag.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies */}
                {agentInsights.sanity.anomalies && agentInsights.sanity.anomalies.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Anomalies Detected</h3>
                    <div className="space-y-2">
                      {agentInsights.sanity.anomalies.map((anomaly: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-foreground/80 text-sm">{JSON.stringify(anomaly, null, 2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plagiarism Analysis */}
                {agentInsights.sanity.plagiarismAnalysis && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Plagiarism Analysis</h3>
                    <div className={`p-4 rounded-lg border ${
                      agentInsights.sanity.plagiarismAnalysis.suspicious 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'bg-red-400' 
                              : 'bg-emerald-400'
                          }`} />
                          <span className={`text-lg font-semibold ${
                            agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'text-red-400' 
                              : 'text-emerald-400'
                          }`}>
                            {agentInsights.sanity.plagiarismAnalysis.suspicious 
                              ? 'Suspicious Activity Detected' 
                              : 'No Plagiarism Detected'}
                          </span>
                        </div>
                        {agentInsights.sanity.plagiarismAnalysis.confidence !== undefined && (
                          <Badge className={
                            agentInsights.sanity.plagiarismAnalysis.suspicious
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }>
                            Confidence: {agentInsights.sanity.plagiarismAnalysis.confidence}%
                          </Badge>
                        )}
                      </div>
                      
                      {/* Patterns Detected */}
                      {agentInsights.sanity.plagiarismAnalysis.patterns && 
                       Array.isArray(agentInsights.sanity.plagiarismAnalysis.patterns) && 
                       agentInsights.sanity.plagiarismAnalysis.patterns.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-foreground font-semibold text-sm mb-2">
                            Detected Patterns ({agentInsights.sanity.plagiarismAnalysis.patterns.length})
                          </h4>
                          <div className="space-y-2">
                            {agentInsights.sanity.plagiarismAnalysis.patterns.map((pattern: any, index: number) => (
                              <div key={index} className="p-3 rounded-lg bg-card/60 border border-border">
                                <div className="text-foreground/80 text-sm space-y-1">
                                  {pattern.type && (
                                    <p><span className="text-muted-foreground">Type:</span> {pattern.type}</p>
                                  )}
                                  {pattern.description && (
                                    <p><span className="text-muted-foreground">Description:</span> {pattern.description}</p>
                                  )}
                                  {pattern.source && (
                                    <p><span className="text-muted-foreground">Source:</span> {pattern.source}</p>
                                  )}
                                  {pattern.similarity !== undefined && (
                                    <p><span className="text-muted-foreground">Similarity:</span> {Math.round(pattern.similarity * 100)}%</p>
                                  )}
                                  {pattern.confidence !== undefined && (
                                    <p><span className="text-muted-foreground">Confidence:</span> {pattern.confidence}%</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show message if no patterns but analysis exists */}
                      {(!agentInsights.sanity.plagiarismAnalysis.patterns || 
                        (Array.isArray(agentInsights.sanity.plagiarismAnalysis.patterns) && 
                         agentInsights.sanity.plagiarismAnalysis.patterns.length === 0)) && (
                        <div className="mt-2 text-muted-foreground text-sm">
                          {agentInsights.sanity.plagiarismAnalysis.suspicious 
                            ? 'No specific patterns identified, but suspicious activity was detected.' 
                            : 'No suspicious patterns or plagiarism indicators found in the code.'}
                        </div>
                      )}
                      
                      {/* Additional metadata if present */}
                      {agentInsights.sanity.plagiarismAnalysis.metadata && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-muted-foreground text-xs mb-2">Additional Information</h4>
                          <div className="text-muted-foreground/70 text-xs space-y-1">
                            {Object.entries(agentInsights.sanity.plagiarismAnalysis.metadata).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}:</span>{' '}
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sanity Checks */}
                {agentInsights.sanity.sanityChecks && agentInsights.sanity.sanityChecks.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3">Sanity Checks</h3>
                    <div className="space-y-2">
                      {(Array.isArray(agentInsights.sanity.sanityChecks)
                        ? agentInsights.sanity.sanityChecks
                        : Object.entries(agentInsights.sanity.sanityChecks).map(([k, v]) => ({ check: k, status: v, message: '' }))
                      ).map((item: any, idx: number) => {
                        const checkName = item.check ?? item.name ?? String(idx);
                        const status = item.status ?? item.result;
                        const message = item.message ?? item.description ?? '';
                        const isPassed = status === 'passed' || status === true || status === 'pass';
                        const isFailed = status === 'failed' || status === false || status === 'fail';
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border">
                            <div>
                              <span className="text-foreground/80 text-sm">{checkName.replace(/_/g, ' ')}</span>
                              {message && <p className="text-muted-foreground/70 text-xs mt-0.5">{message}</p>}
                            </div>
                            <Badge className={
                              isPassed ? 'bg-emerald-500/20 text-emerald-400' :
                              isFailed ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }>
                              {isPassed ? 'PASS' : isFailed ? 'FAIL' : String(status)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {agentInsights.sanity.explanation && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h3 className="text-red-400 font-semibold mb-2">Risk Assessment Explanation</h3>
                    <p className="text-foreground/80 text-sm">{agentInsights.sanity.explanation}</p>
                  </div>
                )}

                {/* Confidence */}
                {agentInsights.sanity.confidence !== undefined && (
                  <div className="text-muted-foreground text-xs">
                    Confidence: {agentInsights.sanity.confidence}%
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Candidate Fit Summary - Metrics + Fit assessment for recruiters */}
          {(agentInsights.judge || agentInsights.metrics) && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Candidate Fit Summary
                </CardTitle>
                <p className="text-muted-foreground/70 text-sm font-normal mt-1">
                  How is this candidate a good fit? Metrics and assessment from AI usage analysis
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {agentInsights.judge?.candidate_fit_summary && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <p className="text-foreground/80 text-sm">{agentInsights.judge.candidate_fit_summary}</p>
                  </div>
                )}
                {/* Primary scores row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(agentInsights.metrics?.promptIQ ?? agentInsights.metrics?.promptQuality) !== undefined && (
                    <div className="p-3 rounded-lg border border-border bg-card/60">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Prompt IQ</div>
                      <div className={`text-xl font-bold ${
                        (agentInsights.metrics!.promptIQ ?? agentInsights.metrics!.promptQuality) >= 70 ? 'text-emerald-400' :
                        (agentInsights.metrics!.promptIQ ?? agentInsights.metrics!.promptQuality) >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>{agentInsights.metrics!.promptIQ ?? agentInsights.metrics!.promptQuality}/100</div>
                      <Progress value={agentInsights.metrics!.promptIQ ?? agentInsights.metrics!.promptQuality} className="h-1.5 mt-1" />
                    </div>
                  )}
                  {agentInsights.metrics?.selfReliance !== undefined && (
                    <div className="p-3 rounded-lg border border-border bg-card/60">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Self Reliance</div>
                      <div className={`text-xl font-bold ${
                        agentInsights.metrics.selfReliance >= 70 ? 'text-emerald-400' :
                        agentInsights.metrics.selfReliance >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>{agentInsights.metrics.selfReliance}/100</div>
                      <Progress value={agentInsights.metrics.selfReliance} className="h-1.5 mt-1" />
                    </div>
                  )}
                  {agentInsights.judge?.ai_usage_quality_score !== undefined && (
                    <div className="p-3 rounded-lg border border-border bg-card/60">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">AI Usage Quality</div>
                      <div className={`text-xl font-bold ${
                        agentInsights.judge.ai_usage_quality_score >= 7 ? 'text-emerald-400' :
                        agentInsights.judge.ai_usage_quality_score >= 4 ? 'text-amber-400' : 'text-red-400'
                      }`}>{agentInsights.judge.ai_usage_quality_score}/10</div>
                      <Progress value={(agentInsights.judge.ai_usage_quality_score / 10) * 100} className="h-1.5 mt-1" />
                    </div>
                  )}
                  {agentInsights.judge?.integrity_verdict && (
                    <div className="p-3 rounded-lg border border-border bg-card/60 flex flex-col justify-center">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Integrity</div>
                      <Badge className={`w-fit ${
                        agentInsights.judge.integrity_verdict === 'pass' ? 'bg-emerald-500/20 text-emerald-400' :
                        agentInsights.judge.integrity_verdict === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {agentInsights.judge.integrity_verdict.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Activity counters */}
                {agentInsights.metrics && (
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/70">
                    {agentInsights.metrics.promptCount !== undefined && (
                      <span>AI prompts: <span className="text-foreground/80">{agentInsights.metrics.promptCount}</span></span>
                    )}
                    {agentInsights.metrics.copyCount !== undefined && (
                      <span>Copy/paste: <span className="text-foreground/80">{agentInsights.metrics.copyCount}</span></span>
                    )}
                    {agentInsights.metrics.applyCount !== undefined && (
                      <span>AI code applied: <span className="text-foreground/80">{agentInsights.metrics.applyCount}</span></span>
                    )}
                    {agentInsights.metrics.modelSwitches !== undefined && (
                      <span>Model switches: <span className="text-foreground/80">{agentInsights.metrics.modelSwitches}</span></span>
                    )}
                    {agentInsights.metrics.totalTokens !== undefined && agentInsights.metrics.totalTokens > 0 && (
                      <span>Total tokens: <span className="text-foreground/80">{agentInsights.metrics.totalTokens.toLocaleString()}</span></span>
                    )}
                  </div>
                )}

                {/* Per-model token breakdown */}
                {agentInsights.metrics?.modelBreakdown && agentInsights.metrics.modelBreakdown.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Model Usage Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground/70 border-b border-border">
                            <th className="text-left py-1.5 pr-4 font-normal">Model</th>
                            <th className="text-right py-1.5 pr-4 font-normal">Prompts</th>
                            <th className="text-right py-1.5 pr-4 font-normal">Input tokens</th>
                            <th className="text-right py-1.5 pr-4 font-normal">Output tokens</th>
                            <th className="text-right py-1.5 font-normal">Avg latency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentInsights.metrics.modelBreakdown.map((m, i) => (
                            <tr key={i} className="border-b border-border/50 text-foreground/80">
                              <td className="py-1.5 pr-4 font-mono text-foreground">{m.model}</td>
                              <td className="text-right py-1.5 pr-4">{m.promptCount}</td>
                              <td className="text-right py-1.5 pr-4">{m.promptTokens.toLocaleString()}</td>
                              <td className="text-right py-1.5 pr-4">{m.completionTokens.toLocaleString()}</td>
                              <td className="text-right py-1.5">{m.avgLatencyMs > 0 ? `${(m.avgLatencyMs / 1000).toFixed(1)}s` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gemini Video Analysis */}
          {agentInsights.geminiVideoAnalysis && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-violet-400" />
                  Screenshare Analysis
                  <Badge className={`ml-2 ${
                    agentInsights.geminiVideoAnalysis.overallVerdict === 'focused' ? 'bg-emerald-500/20 text-emerald-400' :
                    agentInsights.geminiVideoAnalysis.overallVerdict === 'somewhat_distracted' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {agentInsights.geminiVideoAnalysis.overallVerdict.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Badge className="ml-1 bg-muted/70 text-muted-foreground">
                    {agentInsights.geminiVideoAnalysis.confidence} confidence
                  </Badge>
                </CardTitle>
                <p className="text-muted-foreground/70 text-sm font-normal mt-1">
                  AI analysis of {agentInsights.geminiVideoAnalysis.framesAnalyzed} frames from {agentInsights.geminiVideoAnalysis.totalChunks} recording chunks
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
                  <p className="text-foreground/80 text-sm leading-relaxed">{agentInsights.geminiVideoAnalysis.summary}</p>
                </div>

                {/* Two-column: time on task + coding behavior */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-card/60 border border-border">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Time on Task</div>
                    <div className="text-xl font-bold text-emerald-400">{agentInsights.geminiVideoAnalysis.timeOnTask}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-card/60 border border-border">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Coding Behavior</div>
                    <div className="text-sm text-foreground leading-snug">{agentInsights.geminiVideoAnalysis.codingBehavior}</div>
                  </div>
                </div>

                {/* Tools observed */}
                {agentInsights.geminiVideoAnalysis.toolsObserved.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Tools &amp; Sites Observed</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {agentInsights.geminiVideoAnalysis.toolsObserved.map((tool, i) => (
                        <Badge key={i} className="bg-muted text-foreground/80">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suspicious activity */}
                {agentInsights.geminiVideoAnalysis.suspiciousActivity.length > 0 && (
                  <div>
                    <h4 className="text-red-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Suspicious Activity ({agentInsights.geminiVideoAnalysis.suspiciousActivity.length})
                    </h4>
                    <div className="space-y-2">
                      {agentInsights.geminiVideoAnalysis.suspiciousActivity.map((item, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-foreground/80">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {agentInsights.geminiVideoAnalysis.suspiciousActivity.length === 0 && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    No suspicious activity detected
                  </div>
                )}

                {/* Key moments timeline */}
                {agentInsights.geminiVideoAnalysis.keyMoments.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Key Moments</h4>
                    <div className="space-y-2">
                      {agentInsights.geminiVideoAnalysis.keyMoments.map((moment, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-card/60 border border-border">
                          <span className="text-violet-400 text-xs font-mono shrink-0 mt-0.5">{moment.timestamp}</span>
                          <span className="text-foreground/80 text-sm">{moment.observation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Agent Insights Available */}
          {!agentInsights.watcher && !agentInsights.extractor && !agentInsights.sanity && (
            <Card className="border-border bg-background">
              <CardContent className="p-6 text-muted-foreground text-center">
                No agent insights available for this session. Agent analysis may still be processing.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recordings Tab - Only for recruiters */}
      {activeTab === 'recordings' && !isCandidateView && (
        <div className="space-y-6">
          {normalizedVideoChunks.length === 0 ? (
            <Card className="border-border bg-background">
              <CardContent className="p-6 text-muted-foreground text-center">
                No recordings available for this session.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Webcam Feed */}
              {normalizedVideoChunks.filter(c => {
                // Use streamType field first, then fall back to URL
                return c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'));
              }).length > 0 && (
                <Card className="border-border bg-background">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Webcam Recording
                      <span className="text-xs text-muted-foreground ml-2">
                        ({normalizedVideoChunks.filter(c => c.streamType === 'webcam' || (!c.streamType && c.url?.includes('/webcam/'))).length} chunks)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {webcamLoading && (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-border border-t-white animate-spin" />
                        <p className="text-muted-foreground text-sm">
                          Loading recording… {webcamLoading.done}/{webcamLoading.total} chunks
                        </p>
                        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 transition-all duration-200"
                            style={{ width: `${Math.round((webcamLoading.done / webcamLoading.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!webcamLoading && webcamBlobUrl && (
                      <video
                        src={webcamBlobUrl}
                        controls
                        preload="auto"
                        className="w-full bg-black rounded-lg object-contain"
                        style={{ height: '360px' }}
                        onLoadedMetadata={(e) => {
                          // MediaRecorder WebM has no Duration element — browser reports Infinity.
                          // Seeking to a huge time forces Chrome to scan to end and discover real duration.
                          const v = e.currentTarget
                          if (!isFinite(v.duration)) {
                            const snapBack = () => { v.currentTime = 0; v.removeEventListener('seeked', snapBack) }
                            v.addEventListener('seeked', snapBack)
                            v.currentTime = 1e9
                          }
                        }}
                      />
                    )}
                    {!webcamLoading && !webcamBlobUrl && (
                      <div className="flex items-center justify-center py-10 text-muted-foreground/70 text-sm">
                        Could not load webcam recording.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Screen Share Feed */}
              {normalizedVideoChunks.filter(c => {
                // Use streamType field first, then fall back to URL
                return c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'));
              }).length > 0 && (
                <Card className="border-border bg-background">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Screen Share Recording
                      <span className="text-xs text-muted-foreground ml-2">
                        ({normalizedVideoChunks.filter(c => c.streamType === 'screenshare' || (!c.streamType && c.url?.includes('/screenshare/'))).length} chunks)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {screenshareLoading && (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-border border-t-white animate-spin" />
                        <p className="text-muted-foreground text-sm">
                          Loading recording… {screenshareLoading.done}/{screenshareLoading.total} chunks
                        </p>
                        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 transition-all duration-200"
                            style={{ width: `${Math.round((screenshareLoading.done / screenshareLoading.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!screenshareLoading && screenshareBlobUrl && (
                      <video
                        src={screenshareBlobUrl}
                        controls
                        preload="auto"
                        className="w-full bg-black rounded-lg object-contain"
                        style={{ height: '360px' }}
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget
                          if (!isFinite(v.duration)) { v.currentTime = 1e9 }
                        }}
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget
                          if (isFinite(v.duration) && v.currentTime > v.duration - 0.1) {
                            v.currentTime = 0
                          }
                        }}
                      />
                    )}
                    {!screenshareLoading && !screenshareBlobUrl && (
                      <div className="flex items-center justify-center py-10 text-muted-foreground/70 text-sm">
                        Could not load screen share recording.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Insights Tab - Simplified candidate-friendly view */}
      {activeTab === 'my-insights' && isCandidateView && agentInsights && (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">My Performance Insights</h2>
            <p className="text-muted-foreground text-sm">
              Here's how you used AI assistance and some tips for improvement
            </p>
          </div>

          {/* Prompt Behavior - How candidate used AI */}
          {agentInsights.extractor && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-violet-400" />
                  AI Assistance Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Interaction Summary */}
                {aiInteractions && aiInteractions.length > 0 && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Total AI Requests</span>
                      <span className="text-2xl font-bold text-foreground">{aiInteractions.length}</span>
                    </div>
                    <p className="text-muted-foreground/70 text-xs mt-2">
                      You asked for AI help {aiInteractions.length} time{aiInteractions.length !== 1 ? 's' : ''} during this assessment
                    </p>
                  </div>
                )}

                {/* Prompt Patterns - Simplified */}
                {agentInsights.extractor.patterns?.promptPatterns && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 text-sm">Prompt Patterns</h3>
                    <div className="space-y-2">
                      {typeof agentInsights.extractor.patterns.promptPatterns === 'object' ? (
                        Object.entries(agentInsights.extractor.patterns.promptPatterns).slice(0, 5).map(([key, value]: [string, any]) => (
                          <div key={key} className="p-3 rounded-lg bg-card/60 border border-border">
                            <div className="text-foreground/80 text-sm">
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                              <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <p className="text-foreground/80 text-sm">{String(agentInsights.extractor.patterns.promptPatterns).substring(0, 200)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Behavior Score - Simplified */}
                {agentInsights.extractor.behaviorScore !== undefined && (
                  <div className="p-4 rounded-lg border border-border bg-card/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground text-sm">Code Quality Score</span>
                      <span className={`text-2xl font-bold ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'text-emerald-400' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {agentInsights.extractor.behaviorScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={agentInsights.extractor.behaviorScore} 
                      className={`h-2 ${
                        agentInsights.extractor.behaviorScore >= 70 ? 'bg-emerald-500/20' :
                        agentInsights.extractor.behaviorScore >= 40 ? 'bg-amber-500/20' :
                        'bg-red-500/20'
                      }`}
                    />
                    <p className="text-muted-foreground/70 text-xs mt-2">
                      {agentInsights.extractor.behaviorScore >= 70 
                        ? 'Great job! Your code quality is excellent.'
                        : agentInsights.extractor.behaviorScore >= 40
                        ? 'Good effort! Consider reviewing best practices.'
                        : 'Keep practicing! Focus on code quality and structure.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Minor Mistakes & Improvements */}
          {agentInsights.extractor && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Code Quality Issues - Simplified */}
                {agentInsights.extractor.codeQuality && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 text-sm">Code Quality</h3>
                    <div className="space-y-2">
                      {agentInsights.extractor.codeQuality.totalLines !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Lines of Code</span>
                            <span className="text-foreground font-semibold">{agentInsights.extractor.codeQuality.totalLines}</span>
                          </div>
                          {agentInsights.extractor.codeQuality.commentRatio !== undefined && (
                            <p className="text-muted-foreground/70 text-xs mt-2">
                              Comment ratio: {Math.round(agentInsights.extractor.codeQuality.commentRatio * 100)}%
                              {agentInsights.extractor.codeQuality.commentRatio < 0.1 && (
                                <span className="text-amber-400 ml-2">💡 Tip: Add more comments to explain your code</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      {agentInsights.extractor.codeQuality.complexity && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Code Complexity</span>
                            <span className={`font-semibold ${
                              agentInsights.extractor.codeQuality.complexity === 'high' ? 'text-amber-400' :
                              agentInsights.extractor.codeQuality.complexity === 'medium' ? 'text-violet-400' :
                              'text-emerald-400'
                            }`}>
                              {agentInsights.extractor.codeQuality.complexity?.toUpperCase() || 'N/A'}
                            </span>
                          </div>
                          {agentInsights.extractor.codeQuality.complexity === 'high' && (
                            <p className="text-muted-foreground/70 text-xs mt-2">
                              💡 Tip: Consider breaking down complex functions into smaller, more manageable pieces
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Code Integration Issues - Simplified */}
                {agentInsights.extractor.codeIntegration && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 text-sm">Code Integration</h3>
                    <div className="space-y-2">
                      {agentInsights.extractor.codeIntegration.modifications !== undefined && (
                        <div className="p-3 rounded-lg bg-card/60 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Code Modifications</span>
                            <span className="text-foreground font-semibold">{agentInsights.extractor.codeIntegration.modifications}</span>
                          </div>
                          {agentInsights.extractor.codeIntegration.integrationQuality && (
                            <p className="text-muted-foreground/70 text-xs mt-2">
                              Integration quality: <span className={`${
                                agentInsights.extractor.codeIntegration.integrationQuality === 'good' ? 'text-emerald-400' :
                                agentInsights.extractor.codeIntegration.integrationQuality === 'fair' ? 'text-amber-400' :
                                'text-red-400'
                              }`}>
                                {agentInsights.extractor.codeIntegration.integrationQuality.toUpperCase()}
                              </span>
                              {agentInsights.extractor.codeIntegration.integrationQuality === 'poor' && (
                                <span className="text-amber-400 ml-2">💡 Tip: Make sure your code integrates well with the existing codebase</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Copy-Paste Patterns - Educational */}
                {agentInsights.extractor.patterns?.copyPastePatterns && 
                 agentInsights.extractor.patterns.copyPastePatterns.length > 0 && (
                  <div>
                    <h3 className="text-foreground font-semibold mb-3 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Code Patterns Detected
                    </h3>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-amber-400 text-sm font-semibold mb-2">
                        {agentInsights.extractor.patterns.copyPastePatterns.length} pattern{agentInsights.extractor.patterns.copyPastePatterns.length !== 1 ? 's' : ''} detected
                      </p>
                      <p className="text-foreground/80 text-sm">
                        💡 Tip: While copying code can be helpful for learning, try to understand and modify it to fit your specific needs. 
                        Writing code from scratch helps build deeper understanding.
                      </p>
                    </div>
                  </div>
                )}

                {/* General Feedback */}
                {agentInsights.extractor.explanation && (
                  <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <h3 className="text-violet-400 font-semibold mb-2 text-sm">Feedback</h3>
                    <p className="text-foreground/80 text-sm">{agentInsights.extractor.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills Detected - Positive reinforcement */}
          {agentInsights.extractor?.skills && Object.keys(agentInsights.extractor.skills).length > 0 && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  Skills Demonstrated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(agentInsights.extractor.skills).slice(0, 10).map(([skill, level]: [string, any]) => (
                    <Badge key={skill} className="bg-emerald-500/20 text-emerald-400">
                      {skill}: {level}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground/70 text-xs mt-3">
                  Great job demonstrating these skills! Keep practicing to improve further.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tips for Improvement - from LLM judge (when extractor is empty this still shows) */}
          {agentInsights.judge && (
            <Card className="border-border bg-background">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-violet-400" />
                  AI Usage Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics row: Prompt IQ, Self Reliance, AI Usage Quality, Integrity */}
                {(agentInsights.metrics || agentInsights.judge.ai_usage_quality_score !== undefined || agentInsights.judge.integrity_verdict) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {agentInsights.metrics?.promptQuality !== undefined && (
                      <div className="p-3 rounded-lg border border-border bg-card/60">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Prompt IQ</div>
                        <div className={`text-lg font-bold ${
                          agentInsights.metrics.promptQuality >= 70 ? 'text-emerald-400' :
                          agentInsights.metrics.promptQuality >= 40 ? 'text-amber-400' : 'text-red-400'
                        }`}>{agentInsights.metrics.promptQuality}/100</div>
                        <Progress value={agentInsights.metrics.promptQuality} className="h-1 mt-1" />
                      </div>
                    )}
                    {agentInsights.metrics?.selfReliance !== undefined && (
                      <div className="p-3 rounded-lg border border-border bg-card/60">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Self Reliance</div>
                        <div className={`text-lg font-bold ${
                          agentInsights.metrics.selfReliance >= 70 ? 'text-emerald-400' :
                          agentInsights.metrics.selfReliance >= 40 ? 'text-amber-400' : 'text-red-400'
                        }`}>{agentInsights.metrics.selfReliance}/100</div>
                        <Progress value={agentInsights.metrics.selfReliance} className="h-1 mt-1" />
                      </div>
                    )}
                    {agentInsights.judge.ai_usage_quality_score !== undefined && (
                      <div className="p-3 rounded-lg border border-border bg-card/60">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">AI Usage Quality</div>
                        <div className={`text-lg font-bold ${
                          agentInsights.judge.ai_usage_quality_score >= 7 ? 'text-emerald-400' :
                          agentInsights.judge.ai_usage_quality_score >= 4 ? 'text-amber-400' : 'text-red-400'
                        }`}>{agentInsights.judge.ai_usage_quality_score}/10</div>
                        <Progress value={(agentInsights.judge.ai_usage_quality_score / 10) * 100} className="h-1 mt-1" />
                      </div>
                    )}
                    {agentInsights.judge.integrity_verdict && (
                      <div className="p-3 rounded-lg border border-border bg-card/60 flex flex-col justify-center">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Integrity</div>
                        <Badge className={`w-fit ${
                          agentInsights.judge.integrity_verdict === 'pass' ? 'bg-emerald-500/20 text-emerald-400' :
                          agentInsights.judge.integrity_verdict === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {agentInsights.judge.integrity_verdict.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                {agentInsights.judge.ai_usage_narrative && (
                  <p className="text-foreground/80 text-sm">{agentInsights.judge.ai_usage_narrative}</p>
                )}
                {Array.isArray(agentInsights.judge.strengths) && agentInsights.judge.strengths.length > 0 && (
                  <div>
                    <h3 className="text-emerald-400 font-semibold mb-2 text-sm">Strengths</h3>
                    <ul className="list-disc list-inside space-y-1 text-foreground/80 text-sm">
                      {agentInsights.judge.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(agentInsights.judge.weaknesses) && agentInsights.judge.weaknesses.length > 0 && (
                  <div>
                    <h3 className="text-amber-400 font-semibold mb-2 text-sm">Tips for Improvement</h3>
                    <ul className="list-disc list-inside space-y-1 text-foreground/80 text-sm">
                      {agentInsights.judge.weaknesses.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty state - when no extractor or judge data */}
          {!agentInsights.extractor && !agentInsights.judge && (
            <Card className="border-border bg-background">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground/70 text-sm">
                  Performance insights are still being generated. Check back in a moment or refresh the page.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Code Tab — candidate's final workspace files ─────────────────────── */}
      {activeTab === 'code' && !isCandidateView && session?.finalCode && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Candidate Code</h2>
            <p className="text-muted-foreground text-sm">
              Final state of the workspace collected when the session ended.
            </p>
          </div>

          {parsedFiles ? (
            /* Multi-file IDE workspace */
            <div className="flex gap-4 min-h-[500px]">
              {/* File tree */}
              <div className="w-56 flex-shrink-0 rounded-lg border border-border bg-background p-2 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-2 py-1 mb-1">Files</p>
                {Object.keys(parsedFiles).sort().map(filePath => (
                  <button
                    key={filePath}
                    onClick={() => setSelectedCodeFile(filePath)}
                    title={filePath}
                    className={`w-full text-left text-xs px-2 py-1 rounded truncate transition-colors ${
                      selectedCodeFile === filePath
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {filePath.split('/').pop()}
                    <span className="block text-[10px] text-muted-foreground/60 truncate">{filePath}</span>
                  </button>
                ))}
              </div>

              {/* File content */}
              <div className="flex-1 rounded-lg border border-border bg-background overflow-hidden">
                {selectedCodeFile && parsedFiles[selectedCodeFile] !== undefined ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
                      <span className="text-xs text-foreground/80 font-mono">{selectedCodeFile}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(parsedFiles[selectedCodeFile])
                        }}
                        className="text-[10px] text-muted-foreground/70 hover:text-foreground transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="p-4 text-xs text-foreground/80 font-mono overflow-auto max-h-[calc(100vh-280px)] whitespace-pre-wrap break-all">
                      {parsedFiles[selectedCodeFile] || <span className="text-muted-foreground/60 italic">(empty file)</span>}
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground/60 text-sm">
                    Select a file to view its contents
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Legacy single-file plain text */
            <Card className="border-border bg-background">
              <CardContent className="p-0">
                <pre className="p-4 text-xs text-foreground/80 font-mono overflow-auto max-h-[600px] whitespace-pre-wrap break-all">
                  {session.finalCode}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
