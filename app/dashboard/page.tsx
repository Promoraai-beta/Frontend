"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Plus } from "lucide-react"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { JobCard } from "@/components/dashboard/job-card"
import { CandidateList } from "@/components/dashboard/candidate-list"
import { CompanyInfo } from "@/components/dashboard/company-info"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { PromptIQChart } from "@/components/dashboard/promptiq-chart"
import { AIUsageBreakdown } from "@/components/dashboard/ai-usage-breakdown"
import { RecentAssessments } from "@/components/dashboard/recent-assessments"
// Removed mockJobs import - using real assessments from backend
import { AnimatedBackground } from "@/components/animated-background"
import { API_BASE_URL } from "@/lib/config"
import { api } from "@/lib/api"
import { CreateAssessmentModal } from "@/components/dashboard/create-assessment-modal"
import Link from "next/link"

export default function DashboardPage() {
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
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then(data => data.success ? (data.data || []) : [])
          .catch(err => {
            console.error('Error loading assessments:', err);
            return [];
          }),
        api.get('/api/sessions')
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then(data => data.success ? (data.data || []) : [])
          .catch(err => {
            console.error('Error loading sessions:', err);
            return [];
          })
      ])
      
      setAssessments(assessmentsRes);
      setSessions(sessionsRes);
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch in browser
    if (typeof window === 'undefined') return;
    loadAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  // Map assessments to jobs format with real statistics from sessions
  const jobs = assessments.map((assessment) => {
    const assessmentSessions = sessions.filter(s => s.assessmentId === assessment.id);
    const candidatesSelected = assessmentSessions.length;
    const candidatesAttempted = assessmentSessions.filter(s => s.status === 'active' || s.status === 'submitted').length;
    const candidatesCompleted = assessmentSessions.filter(s => s.status === 'submitted').length;
    const isActive = assessment.isActive !== undefined ? assessment.isActive : true;
    
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
      status: isActive ? 'active' as const : 'draft' as const, // Use 'draft' instead of 'inactive' for Job type compatibility
      isActive
    };
  });

  const handleToggleStatus = async (assessmentId: string, currentStatus: boolean) => {
    try {
      const response = await api.patch(`/api/assessments/${assessmentId}/status`, {
        isActive: !currentStatus
      })
      const data = await response.json()
      if (data.success) {
        // Reload assessments
        loadAssessments()
      } else {
        alert(data.error || 'Failed to update assessment status')
      }
    } catch (error: any) {
      console.error('Error updating assessment status:', error)
      alert(error.message || 'Failed to update assessment status')
    }
  }

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      return
    }

    try {
      const response = await api.delete(`/api/assessments/${assessmentId}`)
      const data = await response.json()
      if (data.success) {
        // Reload assessments
        loadAssessments()
        // Clear selection if deleted assessment was selected
        if (selectedJobId === assessmentId) {
          setSelectedJobId(null)
        }
      } else {
        alert(data.error || 'Failed to delete assessment')
      }
    } catch (error: any) {
      console.error('Error deleting assessment:', error)
      // Try to get error message from response
      try {
        const errorData = await error.json?.() || {}
        alert(errorData.error || error.message || 'Failed to delete assessment')
      } catch {
        alert(error.message || 'Failed to delete assessment')
      }
    }
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || assessments.find(a => a.id === selectedJobId)
  
  // Get candidates from sessions
  const filteredCandidates = selectedJobId 
    ? sessions
        .filter((s) => s.assessmentId === selectedJobId)
        .map((s) => {
          const formatDate = (date: string | Date | null | undefined) => {
            if (!date) return undefined;
            try {
              const d = new Date(date);
              return d.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              });
            } catch {
              return undefined;
            }
          };

          return {
            id: s.id, // Session ID (used for links)
            sessionId: s.id, // Explicit session ID for clarity
            name: s.candidateName || s.candidate_name || 'Unknown',
            email: s.candidateEmail || s.candidate_email || '',
            jobId: s.assessmentId || selectedJobId,
            assessmentStatus: (s.status === 'pending' ? 'not-started' : s.status === 'active' ? 'in-progress' : 'completed') as 'not-started' | 'in-progress' | 'completed',
            score: s.score,
            attemptedAt: formatDate(s.startedAt || s.started_at),
            submittedAt: formatDate(s.submittedAt || s.submitted_at),
            duration: s.timeLimit ? `${Math.floor(s.timeLimit / 60)}m` : undefined,
            complianceViolations: 0
          };
        })
    : []

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />

        <RecruiterNavbar />

        <div className="container mx-auto p-4 pt-20 md:p-6 md:pt-24 lg:p-8 lg:pt-28">
          {!selectedJobId ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              {/* Left Column - Main Content (70%) */}
              <div className="space-y-6">
                <div>
                  <DashboardStats />
                </div>

                {/* Charts Section */}
                <div className="grid gap-6 md:grid-cols-2">
                  <PromptIQChart />
                  <AIUsageBreakdown />
                </div>

                {/* Jobs Section */}
                <div className="rounded-2xl border border-zinc-800/50 bg-zinc-950/30 p-6 backdrop-blur-sm">
                  {jobs.length > 0 ? (
                    <>
                      <div className="mb-6 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <h2 className="text-2xl font-bold text-white">
                              {activeFilter === 'active' ? 'Active Positions' : 
                               activeFilter === 'inactive' ? 'Inactive Positions' : 
                               'All Positions'}
                            </h2>
                            <p className="mt-1 text-sm text-zinc-400">
                              Select a position to view candidate AI assessment analytics
                            </p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-white text-black hover:bg-zinc-200"
                            onClick={() => setCreateModalOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Assessment
                          </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <div className="flex gap-1 border border-zinc-800 rounded-lg p-1 bg-zinc-900/50">
                            <Button
                              variant={activeFilter === "all" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setActiveFilter("all")}
                              className={activeFilter === "all" ? "bg-white text-black hover:bg-zinc-200" : "text-zinc-400 hover:text-white"}
                            >
                              All
                            </Button>
                            <Button
                              variant={activeFilter === "active" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setActiveFilter("active")}
                              className={activeFilter === "active" ? "bg-white text-black hover:bg-zinc-200" : "text-zinc-400 hover:text-white"}
                            >
                              Active
                            </Button>
                            <Button
                              variant={activeFilter === "inactive" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setActiveFilter("inactive")}
                              className={activeFilter === "inactive" ? "bg-white text-black hover:bg-zinc-200" : "text-zinc-400 hover:text-white"}
                            >
                              Inactive
                            </Button>
                          </div>
                          <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className={viewMode === "grid" ? "bg-white text-black" : "text-zinc-400"}
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className={viewMode === "list" ? "bg-white text-black" : "text-zinc-400"}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                        {loading ? (
                          <div className="col-span-2 text-center py-8 text-zinc-400">Loading positions...</div>
                        ) : (
                          jobs.map((job) => (
                            <JobCard 
                              key={job.id} 
                              job={job} 
                              onClick={() => setSelectedJobId(job.id)} 
                              isSelected={false}
                              onToggleStatus={handleToggleStatus}
                              onDelete={handleDeleteAssessment}
                            />
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-zinc-400 mb-6 text-lg">No positions yet</p>
                      <Button 
                        variant="default" 
                        size="lg"
                        className="bg-white text-black hover:bg-zinc-200"
                        onClick={() => setCreateModalOpen(true)}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Assessment
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Sidebar (30%) */}
              <div className="space-y-6">
                <CompanyInfo />
                <RecentAssessments />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              <div className="space-y-6">
                <Button
                  onClick={() => setSelectedJobId(null)}
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                >
                  ← Back to Dashboard
                </Button>
                <CandidateList 
                  candidates={filteredCandidates} 
                  jobTitle={selectedJob?.title || selectedJob?.jobTitle || selectedJob?.role || "Assessment"} 
                />
              </div>
              <div className="space-y-6">
                <CompanyInfo />
                <RecentAssessments />
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateAssessmentModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          // Reload assessments after creating
          loadAssessments()
        }}
      />
    </ProtectedRoute>
  )
}
