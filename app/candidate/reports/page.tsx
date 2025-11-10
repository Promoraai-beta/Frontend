"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { Loader2, FileText, Calendar, Clock, TrendingUp, Award } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"

interface AssessmentReport {
  id: string
  sessionCode: string
  title: string
  status: string
  score?: number
  promptIQ?: number
  completedAt?: string
  timeSpent?: number
  totalQuestions?: number
  assessmentType: string
}

export default function CandidateReportsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<AssessmentReport[]>([])
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [filter, setFilter] = useState<"all" | "completed" | "candidate">("all")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadReports()
  }, [user, filter])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/sessions")
      
      if (response.status === 503) {
        setBackendAvailable(false)
        setReports([])
        return
      }
      
      setBackendAvailable(true)
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setReports([])
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // Filter sessions - only show completed candidate-created assessments
        let filteredSessions = data.data.filter((s: any) => {
          // Only show completed sessions
          if (s.status !== 'submitted') return false
          
          // Only show candidate-created assessments (self-assessments)
          if (s.assessment?.assessmentType === 'candidate' && s.assessment?.createdBy === user?.id) {
            return true
          }
          
          return false
        })
        
        // Apply additional filter
        if (filter === "candidate") {
          filteredSessions = filteredSessions.filter((s: any) => 
            s.assessment?.assessmentType === 'candidate'
          )
        }
        
        const reportsData = filteredSessions.map((s: any) => {
          const assessmentTitle = s.assessment?.jobTitle 
            ? `${s.assessment.jobTitle}${s.assessment.level ? ` (${s.assessment.level})` : ''}`
            : `Self Assessment ${s.sessionCode || s.id}`
          
          return {
            id: s.id,
            sessionCode: s.sessionCode || s.session_code,
            title: assessmentTitle,
            status: s.status,
            score: s.score || 0,
            promptIQ: s.promptIQ || 0,
            completedAt: s.submittedAt || s.submitted_at,
            timeSpent: s.timeLimit ? Math.floor(s.timeLimit / 60) : 0,
            totalQuestions: s.assessment?.template?.suggestedAssessments?.length || 0,
            assessmentType: s.assessment?.assessmentType || 'candidate'
          }
        })
        
        // Sort by completed date (newest first)
        reportsData.sort((a: AssessmentReport, b: AssessmentReport) => {
          if (!a.completedAt) return 1
          if (!b.completedAt) return -1
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        })
        
        setReports(reportsData)
      } else {
        setReports([])
      }
    } catch (err: any) {
      console.warn("Error loading reports:", err?.message || err)
      setReports([])
      if (err?.message?.includes('Failed to fetch') || 
          err?.message?.includes('NetworkError')) {
        setBackendAvailable(false)
      }
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const totalAssessments = reports.length
  const averageScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.score || 0), 0) / reports.length)
    : 0
  const averagePromptIQ = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.promptIQ || 0), 0) / reports.length)
    : 0
  const totalTimeSpent = reports.reduce((sum, r) => sum + (r.timeSpent || 0), 0)

  if (loading) {
    return (
      <ProtectedRoute requiredRole="candidate">
        <div className="min-h-screen bg-black relative">
          <AnimatedBackground />
          <CandidateNavbar />
          <div className="relative z-10 container mx-auto px-4 py-24 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="candidate">
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <CandidateNavbar />
        
        <div className="relative z-10 container mx-auto px-4 py-24">
          <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="h-8 w-8" />
              My Assessment Reports
            </h1>
            <p className="text-zinc-400">
              View your completed self-assessments and track your progress
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              Note: Only your self-created assessments are shown here. These are private and not shared with recruiters.
            </p>
          </div>

          {/* Backend Status */}
          {!backendAvailable && (
            <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="pt-6">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Unable to connect to backend server. Reports may not be up to date.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Total Assessments</p>
                      <p className="text-2xl font-bold text-white mt-1">{totalAssessments}</p>
                    </div>
                    <FileText className="h-8 w-8 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Average Score</p>
                      <p className="text-2xl font-bold text-white mt-1">{averageScore}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Avg PromptIQ</p>
                      <p className="text-2xl font-bold text-white mt-1">{averagePromptIQ}</p>
                    </div>
                    <Award className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">Time Spent</p>
                      <p className="text-2xl font-bold text-white mt-1">{totalTimeSpent}h</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className={filter === "all" 
                ? "bg-white text-black hover:bg-zinc-200" 
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }
            >
              All Reports
            </Button>
            <Button
              variant={filter === "candidate" ? "default" : "outline"}
              onClick={() => setFilter("candidate")}
              className={filter === "candidate" 
                ? "bg-white text-black hover:bg-zinc-200" 
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }
            >
              Self-Assessments
            </Button>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-xl text-zinc-400 mb-2">No reports available</p>
                  <p className="text-sm text-zinc-500">
                    Complete some self-assessments to see your reports here.
                  </p>
                  <Button
                    onClick={() => router.push("/candidate/assessments")}
                    className="mt-4 bg-white text-black hover:bg-zinc-200"
                  >
                    Create Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">{report.title}</CardTitle>
                      <CardDescription className="text-zinc-400">
                        {report.completedAt 
                          ? `Completed ${formatDistanceToNow(new Date(report.completedAt), { addSuffix: true })}`
                          : "Completed"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Score</span>
                          <span className="text-white font-bold">{report.score || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">PromptIQ</span>
                          <span className="text-purple-400 font-bold">{report.promptIQ || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Time Spent</span>
                          <span className="text-zinc-300 text-sm">{report.timeSpent || 0}m</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Questions</span>
                          <span className="text-zinc-300 text-sm">{report.totalQuestions || 0}</span>
                        </div>
                        <div className="pt-3 border-t border-zinc-800">
                          <Link href={`/candidate/results/${report.id}`}>
                            <Button 
                              variant="outline" 
                              className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            >
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

