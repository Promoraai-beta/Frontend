"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { SessionDetailView } from "@/components/results/session-detail-view"
import { useAuth } from "@/components/auth-provider"

export default function CandidateResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const sessionId = params.sessionId as string
  const [session, setSession] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [aiInteractions, setAiInteractions] = useState<any[]>([])
  const [videoChunks, setVideoChunks] = useState<any[]>([])
  const [violations, setViolations] = useState<any[]>([])
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [agentInsights, setAgentInsights] = useState<{
    watcher: any;
    extractor: any;
    sanity: any;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    async function loadSessionData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch session data
        const sessionRes = await api.get(`/api/sessions/${sessionId}`)
        const sessionData = await sessionRes.json()
        
        if (!sessionData.success) {
          throw new Error(sessionData.error || "Failed to load session")
        }
        
        const sessionDataObj = sessionData.data
        
        // STRICT SECURITY: Verify this session belongs to the candidate
        // Candidates can ONLY access:
        // 1. Their own candidate assessments (createdBy matches)
        // 2. Recruiter assessments assigned to them (candidateId matches)
        if (sessionDataObj.assessment?.assessmentType === 'candidate') {
          // Candidate assessment - must be created by this user
          if (sessionDataObj.assessment?.createdBy !== user?.id) {
            console.error(`[SECURITY] Candidate ${user?.id} attempted to access candidate assessment ${sessionDataObj.assessment?.id} created by ${sessionDataObj.assessment?.createdBy}`)
            throw new Error("Access denied. This assessment does not belong to you.")
          }
        } else if (sessionDataObj.assessment?.assessmentType === 'recruiter') {
          // Recruiter assessment - must be assigned to this candidate
          if (sessionDataObj.candidateId !== user?.id && sessionDataObj.candidateEmail !== user?.email) {
            console.error(`[SECURITY] Candidate ${user?.id} attempted to access recruiter assessment session ${sessionId} assigned to ${sessionDataObj.candidateId}`)
            throw new Error("Access denied. This session is not assigned to you.")
          }
        } else {
          // Unknown assessment type - deny access
          console.error(`[SECURITY] Candidate ${user?.id} attempted to access session ${sessionId} with unknown assessment type`)
          throw new Error("Access denied. Invalid assessment type.")
        }
        
        setSession(sessionDataObj)

        // Fetch submissions
        const subsRes = await fetch(`${API_BASE_URL}/api/submissions?session_id=${sessionId}`)
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (subsRes.success) setSubmissions(subsRes.data || [])

        // Fetch AI interactions (candidates can see their own AI usage)
        const aiRes = await fetch(`${API_BASE_URL}/api/ai-interactions?session_id=${sessionId}`)
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (aiRes.success) setAiInteractions(aiRes.data || [])

        // STRICT SECURITY: Candidates should NEVER see video recordings or violations
        // These are recruiter-only monitoring features
        // Set empty arrays to ensure no data leaks
        setVideoChunks([])
        setViolations([])
        setRiskScore(null)

        // Fetch simplified agent insights for candidates (educational/feedback purposes)
        // Candidates get simplified insights: prompt behavior and minor mistakes
        try {
          const agentsRes = await api.get(`/api/agents/full-report/${sessionId}`)
          const agentsData = await agentsRes.json()
          
          if (agentsData.success && agentsData.report) {
            const { watcher, extractor, sanity } = agentsData.report
            // Store agent insights for candidate-friendly view (simplified)
            // Note: Candidates only see educational insights, not monitoring/violation data
            setAgentInsights({
              watcher: null, // Don't show monitoring data to candidates
              extractor: extractor || null, // Show code analysis and behavior
              sanity: null // Don't show risk assessment to candidates
            })
          }
        } catch (agentsError) {
          console.warn('Failed to load agent insights for candidate view:', agentsError)
          // Continue without agent insights - they're optional for candidates
        }
      } catch (err: any) {
        console.error("Error loading session data:", err)
        setError(err.message || "Failed to load session data")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadSessionData()
    }
  }, [sessionId, user])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="candidate">
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <CandidateNavbar />
          <div className="container mx-auto flex min-h-screen items-center justify-center p-4 pt-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
              <p className="text-zinc-400">Loading assessment results...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !session) {
    return (
      <ProtectedRoute requiredRole="candidate">
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <CandidateNavbar />
          <div className="container mx-auto flex min-h-screen items-center justify-center p-4 pt-24">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">
                {error || "Session not found"}
              </h1>
              <Button 
                onClick={() => router.push("/candidate/assessments")} 
                className="bg-white text-black hover:bg-zinc-200"
              >
                Back to My Assessments
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="candidate">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />
        <CandidateNavbar />
        
        <div className="container mx-auto p-4 pt-24 md:p-6 md:pt-28">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Button
              onClick={() => router.push("/candidate/assessments")}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Assessments
            </Button>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <h1 className="text-lg font-semibold text-white">
                {session.assessment?.jobTitle || "Assessment"} - Results
              </h1>
              <p className="text-sm text-zinc-400">
                Session: {session.sessionCode || session.session_code || sessionId}
              </p>
              {session.assessment?.assessmentType === 'candidate' && (
                <p className="text-xs text-purple-400 mt-1">
                  Self Assessment
                </p>
              )}
            </div>
          </div>

          {/* Main Content - Use SessionDetailView component */}
          <SessionDetailView
            session={session}
            submissions={submissions}
            aiInteractions={aiInteractions}
            videoChunks={videoChunks}
            violations={violations}
            riskScore={riskScore}
            agentInsights={agentInsights}
            isCandidateView={true}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}

