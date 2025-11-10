"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { SessionDetailView } from "@/components/results/session-detail-view"

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.candidateId as string // This is actually the session ID
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
        
        // STRICT SECURITY: Verify this is a recruiter assessment
        // Recruiters can ONLY access recruiter assessments
        // Backend middleware handles company/ownership verification
        if (sessionDataObj.assessment?.assessmentType !== 'recruiter') {
          throw new Error("Access denied. Recruiters can only view recruiter assessment results.")
        }
        
        setSession(sessionDataObj)

        // Fetch submissions
        const subsRes = await fetch(`${API_BASE_URL}/api/submissions?session_id=${sessionId}`)
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (subsRes.success) setSubmissions(subsRes.data || [])

        // Fetch AI interactions
        const aiRes = await fetch(`${API_BASE_URL}/api/ai-interactions?session_id=${sessionId}`)
          .then(r => r.json())
          .catch(() => ({ success: false, data: [] }))
        if (aiRes.success) setAiInteractions(aiRes.data || [])

        // Fetch video chunks (recruiter-only) - now returns grouped data: { webcam: [...], screenshare: [...] }
        const videoRes = await fetch(`${API_BASE_URL}/api/video/${sessionId}`)
          .then(r => r.json())
          .catch(() => ({ success: false, data: {} }))
        if (videoRes.success && videoRes.data) {
          // Ensure streamType is set on each chunk based on which array it came from
          // Backend now automatically fixes URL mismatches, so we just need to set streamType
          const webcamChunks = (videoRes.data.webcam || []).map((chunk: any) => ({
            ...chunk,
            streamType: 'webcam' // Explicitly set streamType
          }));
          const screenshareChunks = (videoRes.data.screenshare || []).map((chunk: any) => ({
            ...chunk,
            streamType: 'screenshare' // Explicitly set streamType
          }));
          
          // Combine webcam and screenshare chunks into a single array for backwards compatibility
          const allChunks = [...webcamChunks, ...screenshareChunks];
          console.log(`✅ Got ${webcamChunks.length} webcam chunks, ${screenshareChunks.length} screenshare chunks`);
          
          // Log warnings from backend if any mismatches were detected and fixed
          if (videoRes.warnings) {
            if (videoRes.warnings.webcamMismatches > 0) {
              console.warn(`⚠️ Backend fixed ${videoRes.warnings.webcamMismatches} webcam chunk URL(s) with incorrect paths`);
            }
            if (videoRes.warnings.screenshareMismatches > 0) {
              console.warn(`⚠️ Backend fixed ${videoRes.warnings.screenshareMismatches} screenshare chunk URL(s) with incorrect paths`);
            }
          }
          
          setVideoChunks(allChunks);
        }

        // Fetch comprehensive agent analysis from all agents - recruiter-only
        // Use full-report endpoint to get all agent insights at once
        try {
          const agentsRes = await api.get(`/api/agents/full-report/${sessionId}`)
          const agentsData = await agentsRes.json()
          
          if (agentsData.success && agentsData.report) {
            const { watcher, extractor, sanity } = agentsData.report
            
            // Set watcher data (violations, risk score)
            if (watcher) {
              setViolations(watcher.violations || [])
              setRiskScore(watcher.riskScore || sanity?.riskScore || 0)
            }
            
            // Store all agent insights for detailed view
            setAgentInsights({
              watcher: watcher || null,
              extractor: extractor || null,
              sanity: sanity || null
            })
          } else {
            // Fallback to watcher-only endpoint
            const watcherRes = await api.get(`/api/agents/watcher/${sessionId}`)
            const watcherData = await watcherRes.json()
            if (watcherData.success) {
              setViolations(watcherData.violations || [])
              setRiskScore(watcherData.riskScore || 0)
              setAgentInsights({
                watcher: watcherData,
                extractor: null,
                sanity: null
              })
            }
          }
        } catch (agentsError) {
          console.warn('Failed to load agent insights, continuing without them:', agentsError)
          // Continue without agent insights - they're optional
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
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="container mx-auto flex min-h-screen items-center justify-center p-4 pt-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
              <p className="text-zinc-400">Loading session results...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !session) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="container mx-auto flex min-h-screen items-center justify-center p-4 pt-24">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">
                {error || "Session not found"}
              </h1>
              <Button 
                onClick={() => router.push("/dashboard")} 
                className="bg-white text-black hover:bg-zinc-200"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />
        <RecruiterNavbar />
        
        <div className="container mx-auto p-4 pt-24 md:p-6 md:pt-28">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <h1 className="text-lg font-semibold text-white">
                {session.candidateName || session.candidate_name || "Candidate"} - Results
              </h1>
              <p className="text-sm text-zinc-400">
                Session: {session.sessionCode || session.session_code || sessionId}
              </p>
            </div>
          </div>

          {/* Main Content - Recruiter view shows all data */}
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
        </div>
      </div>
    </ProtectedRoute>
  )
}
