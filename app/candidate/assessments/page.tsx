"use client"

import { motion } from "framer-motion"
import { Plus, Search, Clock, BookOpen } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { CreateSelfAssessmentModal } from "@/components/candidate/create-self-assessment-modal"
import { useAuth } from "@/components/auth-provider"

interface Assessment {
  id: string
  sessionCode?: string
  title: string
  status: "completed" | "in-progress" | "draft" | "pending" | "active" | "submitted"
  score?: number | null
  promptIQ?: number
  completedAt?: string | null
  startedAt?: string | null
  totalQuestions: number
  timeSpent: string
  visibility: "public" | "private"
  earnedPoints: number
  company?: string
  isRecruiterAssessment?: boolean
  candidateName?: string
  candidateEmail?: string
  assessmentId?: string
}

export default function MyAssessmentsPage() {
  const { user } = useAuth()
  
  // Strict access control - ensure only candidates can access
  if (typeof window !== 'undefined' && user && user.role !== 'candidate') {
    // This will be handled by layout, but add extra protection
  }
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "in-progress" | "draft">("all")
  const [filterType, setFilterType] = useState<"all" | "recruiter" | "self">("all")
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"recent" | "score" | "title" | "company">("recent")

  useEffect(() => {
    // Only fetch in browser
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    // Fetch sessions for this candidate using authenticated API
    // The backend will automatically filter by candidate if authenticated
    api.get('/api/sessions')
      .then(res => {
        // Handle service unavailable (backend down)
        if (res.status === 503) {
          console.warn('Backend unavailable, showing empty state');
          setBackendAvailable(false);
          return { success: true, data: [] };
        }
        
        // Backend is available
        setBackendAvailable(true);
        
        if (!res.ok) {
          // If 401, user might not be authenticated - that's okay, return empty array
          if (res.status === 401 || res.status === 403) {
            return { success: true, data: [] };
          }
          // For other errors, try to parse JSON error message
          return res.json().then((errorData: any) => {
            throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
          }).catch(() => {
            throw new Error(`HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          const sessions = (data.data || []).map((s: any) => {
            // Get assessment title from assessment data if available
            const assessmentTitle = s.assessment?.jobTitle 
              ? `${s.assessment.jobTitle}${s.assessment.level ? ` (${s.assessment.level})` : ''}`
              : s.assessmentId 
                ? `Assessment ${s.assessmentId}` 
                : `Session ${s.sessionCode || s.session_code || s.id}`;
            
            return {
              id: s.id,
              sessionCode: s.sessionCode || s.session_code,
              title: assessmentTitle,
              status: s.status === 'submitted' ? 'completed' : s.status === 'active' ? 'in-progress' : s.status === 'pending' ? 'draft' : 'draft',
              score: s.score,
              promptIQ: s.promptIQ || 0,
              completedAt: s.submittedAt || s.submitted_at,
              totalQuestions: s.assessment?.template?.suggestedAssessments?.length || 0,
              timeSpent: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : '0m',
              visibility: 'private' as const,
              earnedPoints: s.score || 0
            };
          });
          setAssessments(sessions)
        } else {
          // If data is not successful or null, set empty array
          setAssessments([])
        }
      })
      .catch(err => {
        // Check if it's a network error
        if (err?.message?.includes('Failed to fetch') || 
            err?.message?.includes('NetworkError') ||
            err?.name === 'TypeError') {
          console.warn('Network error (non-blocking):', err?.message || err);
          setBackendAvailable(false);
        } else {
          console.warn('Error loading assessments (non-blocking):', err?.message || err);
        }
        // Silently fail - show empty state instead of error
        // This allows the app to continue functioning even if backend is unavailable
        setAssessments([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Get unique companies for filter
  const companies = Array.from(
    new Set(assessments.map(a => a.company).filter(Boolean))
  ).sort() as string[]

  const filteredAssessments = assessments
    .filter((assessment) => {
      // Status filter
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "completed" && assessment.status === "completed") ||
        (filterStatus === "in-progress" && assessment.status === "in-progress") ||
        (filterStatus === "draft" && assessment.status === "draft")
      
      // Type filter (recruiter vs self-assessment)
      const matchesType = filterType === "all" ||
        (filterType === "recruiter" && assessment.isRecruiterAssessment) ||
        (filterType === "self" && !assessment.isRecruiterAssessment)
      
      // Company filter
      const matchesCompany = filterCompany === "all" || 
        assessment.company === filterCompany
      
      // Search filter (search in title, company, and candidate name)
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = searchQuery === "" ||
        assessment.title.toLowerCase().includes(searchLower) ||
        (assessment.company && assessment.company.toLowerCase().includes(searchLower)) ||
        (assessment.candidateName && assessment.candidateName.toLowerCase().includes(searchLower)) ||
        (assessment.sessionCode && assessment.sessionCode.toLowerCase().includes(searchLower))
      
      return matchesStatus && matchesType && matchesCompany && matchesSearch
    })
    .sort((a, b) => {
      // Sorting logic
      switch (sortBy) {
        case "recent":
          // Sort by completed date (most recent first), then by started date, then by title
          if (a.completedAt && b.completedAt) {
            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          }
          if (a.completedAt) return -1
          if (b.completedAt) return 1
          if (a.startedAt && b.startedAt) {
            return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          }
          if (a.startedAt) return -1
          if (b.startedAt) return 1
          return a.title.localeCompare(b.title)
        case "score":
          // Sort by score (highest first), then by title
          const scoreA = a.score ?? -1
          const scoreB = b.score ?? -1
          if (scoreA !== scoreB) return scoreB - scoreA
          return a.title.localeCompare(b.title)
        case "title":
          return a.title.localeCompare(b.title)
        case "company":
          // Sort by company, then by title
          const companyA = a.company || ""
          const companyB = b.company || ""
          if (companyA !== companyB) return companyA.localeCompare(companyB)
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "in-progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "draft":
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    }
  }

  // Calculate stats from actual assessments data
  const completedCount = assessments.filter((a) => a.status === "completed").length
  const inProgressCount = assessments.filter((a) => a.status === "in-progress").length
  const draftCount = assessments.filter((a) => a.status === "draft").length
  const completedAssessments = assessments.filter((a) => a.status === "completed")
  const averagePromptIQ = completedAssessments.length > 0
    ? Math.round(completedAssessments.reduce((sum, a) => sum + (a.promptIQ || 0), 0) / completedAssessments.length)
    : 0

  return (
    <ProtectedRoute requiredRole="candidate">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />

        <CandidateNavbar />

      <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">My Assessments</h1>
            <p className="text-zinc-400">Track your completed assessments, works in progress, and drafts</p>
          </div>
          <Button 
            onClick={() => {
              if (!user) {
                // Redirect to login if not authenticated
                window.location.href = "/login"
                return
              }
              setCreateModalOpen(true)
            }}
            className="bg-white text-black hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Self Assessment
          </Button>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-blue-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <p className="mb-2 text-5xl font-black text-white">
                {completedCount}
              </p>
              <p className="text-sm font-medium text-zinc-400">Total Completed</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-green-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <p className="mb-2 text-5xl font-black text-white">{averagePromptIQ}</p>
              <p className="text-sm font-medium text-zinc-400">Average PromptIQ</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-purple-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <p className="mb-2 text-5xl font-black text-white">
                {inProgressCount}
              </p>
              <p className="text-sm font-medium text-zinc-400">In Progress</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-yellow-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <p className="mb-2 text-5xl font-black text-white">
                {draftCount}
              </p>
              <p className="text-sm font-medium text-zinc-400">Drafts</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          {/* Status and Type Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              className={
                filterStatus === "all"
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              All Status
            </Button>
            <Button
              variant={filterStatus === "completed" ? "default" : "outline"}
              onClick={() => setFilterStatus("completed")}
              className={
                filterStatus === "completed"
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              Completed
            </Button>
            <Button
              variant={filterStatus === "in-progress" ? "default" : "outline"}
              onClick={() => setFilterStatus("in-progress")}
              className={
                filterStatus === "in-progress"
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              In Progress
            </Button>
            <Button
              variant={filterStatus === "draft" ? "default" : "outline"}
              onClick={() => setFilterStatus("draft")}
              className={
                filterStatus === "draft"
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              Drafts
            </Button>
            
            <div className="mx-2 h-6 w-px bg-white/10" />
            
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className={
                filterType === "all"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              All Types
            </Button>
            <Button
              variant={filterType === "recruiter" ? "default" : "outline"}
              onClick={() => setFilterType("recruiter")}
              className={
                filterType === "recruiter"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              Recruiter Assessments
            </Button>
            <Button
              variant={filterType === "self" ? "default" : "outline"}
              onClick={() => setFilterType("self")}
              className={
                filterType === "self"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                  : "border-white/10 text-zinc-400 hover:bg-white/5"
              }
            >
              Self Assessments
            </Button>
          </div>

          {/* Company Filter and Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Company Filter */}
            {companies.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Company:</label>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                >
                  <option value="all">All Companies</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "score" | "title" | "company")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="score">Highest Score</option>
                <option value="title">Title (A-Z)</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by title, company, or session code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filterStatus !== "all" || filterType !== "all" || filterCompany !== "all" || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-400">Active filters:</span>
              {filterStatus !== "all" && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                  Status: {filterStatus}
                </span>
              )}
              {filterType !== "all" && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                  Type: {filterType === "recruiter" ? "Recruiter" : "Self"}
                </span>
              )}
              {filterCompany !== "all" && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                  Company: {filterCompany}
                </span>
              )}
              {searchQuery && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                  Search: "{searchQuery}"
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus("all")
                  setFilterType("all")
                  setFilterCompany("all")
                  setSearchQuery("")
                }}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Assessments List */}
        <div className="space-y-4">
          {!backendAvailable && !loading && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
              <p className="text-sm text-yellow-400">
                ⚠️ Unable to connect to backend server. Please ensure the backend is running on port 5001.
              </p>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12 text-zinc-400">Loading assessments...</div>
          ) : filteredAssessments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-xl text-zinc-400">No assessments found</p>
              <p className="mb-6 text-sm text-zinc-500">
                {filterStatus !== "all"
                  ? `You don't have any ${filterStatus} assessments yet.`
                  : "You don't have any assessments yet."}
              </p>
            </div>
          ) : (
            filteredAssessments.map((assessment, index) => (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-zinc-950/50 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-zinc-950/80"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-1 items-center gap-6">
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-white/90">{assessment.title}</h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(assessment.status)}`}
                      >
                        {assessment.status}
                      </span>
                      {assessment.isRecruiterAssessment ? (
                        <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                          Recruiter
                        </span>
                      ) : (
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs text-purple-400">
                          Self Assessment
                        </span>
                      )}
                      {assessment.company && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">
                          {assessment.company}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {assessment.totalQuestions} questions
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {assessment.timeSpent}
                      </span>
                      {assessment.completedAt && (
                        <>
                          <span>•</span>
                          <span>Completed on {assessment.completedAt}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {assessment.status === "completed" && (
                    <div className="ml-auto flex gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{assessment.score}%</p>
                        <p className="text-xs text-zinc-500">Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{assessment.promptIQ}</p>
                        <p className="text-xs text-zinc-500">PromptIQ</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-black text-white">{assessment.earnedPoints}</p>
                        <p className="text-xs text-zinc-500">Points</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {assessment.status === "draft" && (
                    <Link href={`/assessment/${(assessment as any).sessionCode || assessment.id}`}>
                      <Button className="bg-white text-black hover:bg-zinc-200">Start Assessment</Button>
                    </Link>
                  )}
                  {assessment.status === "in-progress" && (
                    <Link href={`/assessment/${(assessment as any).sessionCode || assessment.id}`}>
                      <Button className="bg-white text-black hover:bg-zinc-200">Continue</Button>
                    </Link>
                  )}
                  {assessment.status === "completed" && (
                    <Link href={`/candidate/results/${assessment.id}`}>
                      <Button variant="outline" className="border-white/10 bg-transparent text-zinc-400 hover:bg-white/5">
                        View Results
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )))}
        </div>

        {/* Create Self Assessment Modal */}
        <CreateSelfAssessmentModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={() => {
            // Refresh assessments list after creating - use the same improved data fetching
            setLoading(true)
            Promise.all([
              api.get('/api/sessions')
                .then(res => {
                  if (res.status === 503) {
                    setBackendAvailable(false)
                    return { success: true, data: [] }
                  }
                  setBackendAvailable(true)
                  if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                      return { success: true, data: [] }
                    }
                    return { success: true, data: [] }
                  }
                  return res.json()
                })
                .catch(() => {
                  return { success: true, data: [] }
                }),
              api.get('/api/assessments')
                .then(res => {
                  if (res.status === 503) {
                    return { success: true, data: [] }
                  }
                  if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                      return { success: true, data: [] }
                    }
                    return { success: true, data: [] }
                  }
                  return res.json()
                })
                .catch(() => {
                  return { success: true, data: [] }
                })
            ])
              .then(([sessionsData, assessmentsData]) => {
                const sessions = sessionsData?.success ? (sessionsData.data || []) : []
                const candidateAssessments = assessmentsData?.success ? (assessmentsData.data || []) : []
                
                // Map sessions to assessment display format (same logic as initial load)
                const sessionAssessments = sessions.map((s: any) => {
                  const assessmentTitle = s.assessment?.jobTitle 
                    ? `${s.assessment.jobTitle}${s.assessment.level ? ` (${s.assessment.level})` : ''}`
                    : s.assessmentId 
                      ? `Assessment ${s.assessmentId}` 
                      : `Session ${s.sessionCode || s.session_code || s.id}`
                  
                  const isRecruiterAssessment = s.assessment?.assessmentType === 'recruiter'
                  const companyName = s.assessment?.company || s.assessment?.company?.name || null
                  
                  let completedAtFormatted = null
                  if (s.submittedAt || s.submitted_at) {
                    try {
                      const date = new Date(s.submittedAt || s.submitted_at)
                      completedAtFormatted = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    } catch (e) {
                      completedAtFormatted = s.submittedAt || s.submitted_at
                    }
                  }
                  
                  let timeSpent = '0m'
                  if (s.startedAt && s.submittedAt) {
                    try {
                      const start = new Date(s.startedAt)
                      const end = new Date(s.submittedAt)
                      const minutes = Math.floor((end.getTime() - start.getTime()) / 60000)
                      timeSpent = `${minutes}m`
                    } catch (e) {
                      timeSpent = s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : '0m'
                    }
                  } else if (s.timeLimit) {
                    timeSpent = `${Math.floor(s.timeLimit / 60)}m`
                  }
                  
                  return {
                    id: s.id,
                    sessionCode: s.sessionCode || s.session_code,
                    assessmentId: s.assessmentId || s.assessment?.id,
                    title: assessmentTitle,
                    company: companyName,
                    isRecruiterAssessment: isRecruiterAssessment,
                    status: s.status === 'submitted' ? 'completed' : s.status === 'active' ? 'in-progress' : s.status === 'pending' ? 'draft' : 'draft',
                    score: s.score || null,
                    promptIQ: s.promptIQ || 0,
                    completedAt: completedAtFormatted,
                    startedAt: s.startedAt || s.started_at,
                    totalQuestions: s.assessment?.template?.suggestedAssessments?.length || 0,
                    timeSpent: timeSpent,
                    visibility: 'private' as const,
                    earnedPoints: s.score || 0,
                    candidateName: s.candidateName || s.candidate_name,
                    candidateEmail: s.candidateEmail || s.candidate_email
                  }
                })
                
                const assessmentOnlyItems = candidateAssessments
                  .filter((a: any) => {
                    const hasSession = sessions.some((s: any) => s.assessmentId === a.id)
                    return !hasSession && a.assessmentType === 'candidate'
                  })
                  .map((a: any) => {
                    const assessmentTitle = a.jobTitle 
                      ? `${a.jobTitle}${a.level ? ` (${a.level})` : ''}`
                      : `Self Assessment ${a.id.substring(0, 8)}`
                    
                    return {
                      id: a.id,
                      sessionCode: null,
                      assessmentId: a.id,
                      title: assessmentTitle,
                      company: a.company?.name || 'Self Assessment',
                      isRecruiterAssessment: false,
                      status: 'draft' as const,
                      score: null,
                      promptIQ: 0,
                      completedAt: null,
                      startedAt: null,
                      totalQuestions: a.template?.suggestedAssessments?.length || 0,
                      timeSpent: '0m',
                      visibility: 'private' as const,
                      earnedPoints: 0,
                      candidateName: null,
                      candidateEmail: null
                    }
                  })
                
                const allAssessments = [...sessionAssessments, ...assessmentOnlyItems]
                const uniqueAssessments = Array.from(
                  new Map(allAssessments.map(item => [item.assessmentId || item.id, item])).values()
                )
                
                setAssessments(uniqueAssessments)
              })
              .catch(err => {
                console.warn('Error refreshing assessments:', err?.message || err)
                setAssessments([])
              })
              .finally(() => {
                setLoading(false)
              })
          }}
        />
      </main>
    </div>
    </ProtectedRoute>
  )
}
