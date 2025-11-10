"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { generateSessionCode } from "@/lib/session"
import { CheckCircle, Loader2, Upload, FileText, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/components/auth-provider"

interface CreateAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateAssessmentModal({ open, onOpenChange, onSuccess }: CreateAssessmentModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<"form" | "success">("form")
  const [assessmentMethod, setAssessmentMethod] = useState<"url" | "description" | "existing">("description")
  const [candidateInputMethod, setCandidateInputMethod] = useState<"single" | "csv">("single")
  const [hasExistingAssessments, setHasExistingAssessments] = useState(false)
  
  // Form fields
  const [candidateName, setCandidateName] = useState("")
  const [candidateEmail, setCandidateEmail] = useState("")
  const [timeLimit, setTimeLimit] = useState(60)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<Array<{ email: string; name?: string }>>([])
  
  // Assessment generation fields
  const [jobUrl, setJobUrl] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [existingAssessmentId, setExistingAssessmentId] = useState("")
  
  // States
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null)
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([])
  const [createdSession, setCreatedSession] = useState<any>(null)
  const [bulkResults, setBulkResults] = useState<any>(null)

  // Check if recruiter has existing assessments when modal opens
  useEffect(() => {
    if (open) {
      checkExistingAssessments()
    }
  }, [open])

  // Load existing assessments when "existing" method is selected
  useEffect(() => {
    if (open && assessmentMethod === "existing" && hasExistingAssessments) {
      loadExistingAssessments()
    }
  }, [open, assessmentMethod, hasExistingAssessments])

  const checkExistingAssessments = async () => {
    try {
      const response = await api.get("/api/assessments")
      const data = await response.json()
      if (data.success) {
        const assessments = data.data || []
        setHasExistingAssessments(assessments.length > 0)
        // If no existing assessments, default to description method
        if (assessments.length === 0) {
          setAssessmentMethod("description")
        }
      }
    } catch (error) {
      console.error("Error checking assessments:", error)
      setHasExistingAssessments(false)
    }
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep("form")
      setCandidateInputMethod("single")
      setCandidateName("")
      setCandidateEmail("")
      setTimeLimit(60)
      setCsvFile(null)
      setCsvPreview([])
      setJobUrl("")
      setJobTitle("")
      setJobDescription("")
      setExistingAssessmentId("")
      setGeneratedAssessment(null)
      setCreatedSession(null)
      setBulkResults(null)
    }
  }, [open])

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    setCsvFile(file)

    // Parse CSV file for preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row')
        return
      }

      // Parse header to find email and name columns
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const emailIndex = header.findIndex(h => h.includes('email') || h === 'email' || h === 'e-mail')
      const nameIndex = header.findIndex(h => h.includes('name') || h === 'name' || h === 'full name' || h === 'fullname' || h === 'candidate name')

      if (emailIndex === -1) {
        alert('CSV file must contain an email column')
        return
      }

      // Extract emails and names
      const preview: Array<{ email: string; name?: string }> = []
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const email = values[emailIndex]?.toLowerCase().trim()
        const name = nameIndex !== -1 ? values[nameIndex]?.trim() : undefined

        if (email && emailRegex.test(email)) {
          preview.push({ email, name })
        }
      }

      setCsvPreview(preview)
    }
    reader.readAsText(file)
  }

  const loadExistingAssessments = async () => {
    try {
      const response = await api.get("/api/assessments")
      const data = await response.json()
      if (data.success) {
        setAvailableAssessments(data.data || [])
      }
    } catch (error) {
      console.error("Error loading assessments:", error)
    }
  }

  const handleGenerateAssessment = async () => {
    setIsGenerating(true)
    try {
      let response

      if (assessmentMethod === "url" && jobUrl) {
        response = await api.post("/api/assessments/generate", {
          url: jobUrl
        })
      } else if (assessmentMethod === "description" && jobTitle && jobDescription) {
        // Company is optional - backend will use recruiter's company if not provided
        response = await api.post("/api/assessments/generate", {
          jobTitle,
          jobDescription,
          ...(user?.company && { company: user.company }) // Only send if available
        })
      } else {
        alert("Please fill in all required fields")
        setIsGenerating(false)
        return
      }

      const data = await response.json()

      if (data.success) {
        if (data.data.templateBuild && data.data.templateBuild.status !== "ready") {
          alert(`Template is still building (status: ${data.data.templateBuild.status}). Please wait and try again.`)
          setIsGenerating(false)
          return
        }
        setGeneratedAssessment(data.data)
      } else {
        alert(`Failed to generate assessment: ${data.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Error generating assessment:", error)
      alert(`Error: ${error.message || "Failed to generate assessment"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateSession = async () => {
    if (candidateInputMethod === "single") {
      if (!candidateEmail || !candidateName) {
        alert("Please fill in all required fields")
        return
      }

      // Determine assessment ID
      let assessmentId = null
      if (assessmentMethod === "url" || assessmentMethod === "description") {
        if (!generatedAssessment) {
          alert("Please generate an assessment first")
          return
        }
        assessmentId = generatedAssessment.assessmentId || generatedAssessment.id
      } else if (assessmentMethod === "existing") {
        if (!existingAssessmentId) {
          alert("Please select an existing assessment")
          return
        }
        assessmentId = existingAssessmentId
      }

      setIsCreating(true)

      try {
        const sessionCode = generateSessionCode()
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const response = await api.post("/api/sessions", {
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          time_limit: timeLimit * 60,
          expires_at: expiresAt.toISOString(),
          assessment_id: assessmentId,
          status: "pending"
        })

        const data = await response.json()

        if (data.success) {
          setCreatedSession({
            ...data.data,
            sessionCode: data.data.sessionCode || sessionCode,
            assessmentUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${data.data.sessionCode || sessionCode}`
          })
          setStep("success")
          if (onSuccess) {
            onSuccess()
          }
        } else {
          alert(`Failed to create session: ${data.error}`)
        }
      } catch (error: any) {
        console.error("Error creating session:", error)
        alert(`Error: ${error.message || "Failed to create session"}`)
      } finally {
        setIsCreating(false)
      }
    } else {
      // Bulk CSV upload
      if (!csvFile) {
        alert("Please upload a CSV file")
        return
      }

      // Determine assessment ID
      let assessmentId = null
      if (assessmentMethod === "url" || assessmentMethod === "description") {
        if (!generatedAssessment) {
          alert("Please generate an assessment first")
          return
        }
        assessmentId = generatedAssessment.assessmentId || generatedAssessment.id
      } else if (assessmentMethod === "existing") {
        if (!existingAssessmentId) {
          alert("Please select an existing assessment")
          return
        }
        assessmentId = existingAssessmentId
      }

      setIsBulkCreating(true)

      try {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const formData = new FormData()
        formData.append("csv", csvFile)
        formData.append("assessment_id", assessmentId)
        formData.append("time_limit", (timeLimit * 60).toString())
        formData.append("expires_at", expiresAt.toISOString())

        const token = localStorage.getItem("auth_token") || localStorage.getItem("jwt_token")
        const response = await fetch(`${API_BASE_URL}/api/sessions/bulk`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })

        const data = await response.json()

        if (data.success) {
          setBulkResults(data.data)
          setStep("success")
          if (onSuccess) {
            onSuccess()
          }
        } else {
          alert(`Failed to create bulk sessions: ${data.error}`)
        }
      } catch (error: any) {
        console.error("Error creating bulk sessions:", error)
        alert(`Error: ${error.message || "Failed to create bulk sessions"}`)
      } finally {
        setIsBulkCreating(false)
      }
    }
  }

  const canCreateSession = () => {
    if (candidateInputMethod === "single") {
      if (!candidateName || !candidateEmail) return false
    } else {
      if (!csvFile) return false
    }
    if (assessmentMethod === "url" || assessmentMethod === "description") {
      return !!generatedAssessment
    }
    if (assessmentMethod === "existing") {
      return !!existingAssessmentId
    }
    return false
  }

  if (step === "success") {
    if (bulkResults) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Bulk Sessions Created Successfully!
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {bulkResults.message}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-1">Total Candidates</p>
                  <p className="text-2xl font-bold text-white">{bulkResults.total}</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-1">Sessions Created</p>
                  <p className="text-2xl font-bold text-emerald-400">{bulkResults.created}</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-1">Emails Sent</p>
                  <p className="text-2xl font-bold text-blue-400">{bulkResults.emailsSent}</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-400">{bulkResults.failed}</p>
                </div>
              </div>

              {bulkResults.errors && bulkResults.errors.length > 0 && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-medium mb-2">Errors:</p>
                  <ul className="text-xs text-red-300 space-y-1 max-h-32 overflow-y-auto">
                    {bulkResults.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-300 text-sm">
                  Assessment invitation emails have been sent to all candidates on behalf of your company. 
                  Candidates will receive their session codes via email.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("form")
                    setBulkResults(null)
                  }}
                  className="flex-1"
                >
                  Create Another
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false)
                    if (onSuccess) onSuccess()
                  }}
                  className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    if (createdSession) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Assessment Invitation Sent Successfully!
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                The candidate has been notified via email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <p className="text-emerald-300 text-lg font-semibold mb-2">
                  Email Sent Successfully!
                </p>
                <p className="text-zinc-400 text-sm">
                  The assessment invitation has been sent to the candidate's email address. 
                  They will receive the session link and code to start the assessment.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  📧 The candidate will receive an email with:
                </p>
                <ul className="text-zinc-400 text-sm mt-2 space-y-1 ml-4">
                  <li>• Assessment invitation link</li>
                  <li>• Session code</li>
                  <li>• Time limit information</li>
                  <li>• What to expect during the assessment</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("form")
                    setCreatedSession(null)
                  }}
                  className="flex-1"
                >
                  Create Another
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false)
                    if (onSuccess) onSuccess()
                  }}
                  className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Create Assessment Session</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Generate a session for a candidate to take an assessment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assessment Method Selection */}
          <div className="space-y-3">
            <Label className="text-zinc-300">Assessment Type</Label>
            <RadioGroup
              value={assessmentMethod}
              onValueChange={(value) => {
                setAssessmentMethod(value as "url" | "description" | "existing")
                setGeneratedAssessment(null)
                setExistingAssessmentId("")
              }}
            >
              {/* URL option hidden - future feature */}
              {/* <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="text-zinc-300 cursor-pointer">
                  Generate from Job URL
                </Label>
              </div> */}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="description" id="description" />
                <Label htmlFor="description" className="text-zinc-300 cursor-pointer">
                  Generate from Job Description
                </Label>
              </div>
              {hasExistingAssessments && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="text-zinc-300 cursor-pointer">
                    Use Existing Assessment
                  </Label>
                </div>
              )}
            </RadioGroup>
            {!hasExistingAssessments && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mt-2">
                <p className="text-xs text-zinc-300">
                  💡 <strong>New recruiter?</strong> Create your first assessment using a job description. Once created, you'll be able to reuse it for future candidates.
                </p>
              </div>
            )}
          </div>

          {/* Job URL Input */}
          {assessmentMethod === "url" && (
            <div className="space-y-3 border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
              <div>
                <Label htmlFor="jobUrl" className="text-zinc-300">
                  Job Posting URL <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="jobUrl"
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://company.com/careers/engineer"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <Button
                onClick={handleGenerateAssessment}
                disabled={isGenerating || !jobUrl}
                className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Assessment...
                  </>
                ) : (
                  "Generate Assessment"
                )}
              </Button>
              {generatedAssessment && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-300 text-sm font-medium">
                    Assessment Generated Successfully!
                  </p>
                  <p className="text-emerald-400 text-xs mt-1">
                    Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Job Description Input */}
          {assessmentMethod === "description" && (
            <div className="space-y-3 border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
              <div>
                <Label htmlFor="jobTitle" className="text-zinc-300">
                  Job Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="jobTitle"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Frontend Developer"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="jobDescription" className="text-zinc-300">
                  Job Description <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="We are looking for a Senior Frontend Developer with experience in React, TypeScript..."
                  rows={5}
                  className="bg-zinc-950 border-zinc-800 text-white resize-none"
                />
              </div>
              <Button
                onClick={handleGenerateAssessment}
                disabled={isGenerating || !jobTitle || !jobDescription}
                className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Assessment...
                  </>
                ) : (
                  "Generate Assessment"
                )}
              </Button>
              {generatedAssessment && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-300 text-sm font-medium">
                    Assessment Generated Successfully!
                  </p>
                  <p className="text-emerald-400 text-xs mt-1">
                    Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Existing Assessments */}
          {assessmentMethod === "existing" && (
            <div className="space-y-3 border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
              <Label htmlFor="existingAssessment" className="text-zinc-300">
                Select Assessment
              </Label>
              <select
                id="existingAssessment"
                value={existingAssessmentId}
                onChange={(e) => setExistingAssessmentId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">-- Select an assessment --</option>
                {availableAssessments.map((assessment: any) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.jobTitle || assessment.role || "Untitled Assessment"} 
                    {assessment.level ? ` (${assessment.level})` : ""}
                  </option>
                ))}
              </select>
              {availableAssessments.length === 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  No assessments available. Create one using "Generate from Job URL" or "Generate from Job Description".
                </p>
              )}
            </div>
          )}

          {/* Candidate Information */}
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div>
              <Label className="text-zinc-300 mb-3 block">Candidate Input Method</Label>
              <RadioGroup
                value={candidateInputMethod}
                onValueChange={(value) => {
                  setCandidateInputMethod(value as "single" | "csv")
                  setCsvFile(null)
                  setCsvPreview([])
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="text-zinc-300 cursor-pointer">
                    Single Candidate
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="text-zinc-300 cursor-pointer">
                    Import from CSV (Bulk)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {candidateInputMethod === "single" ? (
              <>
                <div>
                  <Label htmlFor="candidateName" className="text-zinc-300">
                    Candidate Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="candidateName"
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-zinc-950 border-zinc-800 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="candidateEmail" className="text-zinc-300">
                    Candidate Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    className="bg-zinc-950 border-zinc-800 text-white"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3 border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                <div>
                  <Label htmlFor="csvFile" className="text-zinc-300 mb-2 block">
                    Upload CSV File <span className="text-red-400">*</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="csvFile"
                      className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Choose CSV File</span>
                      <input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </label>
                    {csvFile && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <FileText className="h-4 w-4" />
                        <span>{csvFile.name}</span>
                        <button
                          onClick={() => {
                            setCsvFile(null)
                            setCsvPreview([])
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    CSV must include an "email" column. Optionally include "name" column. Emails will be automatically extracted and invitations will be sent.
                  </p>
                </div>

                {csvPreview.length > 0 && (
                  <div className="border border-zinc-700 rounded-lg p-3 bg-zinc-950">
                    <p className="text-xs text-zinc-400 mb-2">Preview (first {csvPreview.length} candidates):</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {csvPreview.map((candidate, index) => (
                        <div key={index} className="text-xs text-zinc-300">
                          {candidate.name ? `${candidate.name} - ` : ''}{candidate.email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="timeLimit" className="text-zinc-300">
                Time Limit (minutes)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                min="15"
                max="180"
                className="bg-zinc-950 border-zinc-800 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Default: 60 minutes</p>
            </div>
          </div>

          <Button
            onClick={handleCreateSession}
            disabled={isCreating || isBulkCreating || !canCreateSession()}
            className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
          >
            {isCreating || isBulkCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {candidateInputMethod === "csv" ? "Creating Sessions & Sending Emails..." : "Creating Session..."}
              </>
            ) : (
              candidateInputMethod === "csv" ? "Create Sessions & Send Emails" : "Create Session"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

