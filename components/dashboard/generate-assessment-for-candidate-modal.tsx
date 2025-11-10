"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { CheckCircle, Loader2, Sparkles, Mail } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface GenerateAssessmentForCandidateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: {
    id?: string
    name: string
    email: string
    title?: string
    skills?: string[]
    targetRole?: string
    level?: string
    bio?: string
  }
  onSuccess?: () => void
}

export function GenerateAssessmentForCandidateModal({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: GenerateAssessmentForCandidateModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<"form" | "generating" | "creating" | "success">("form")
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState(60)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null)
  const [createdSession, setCreatedSession] = useState<any>(null)
  const [error, setError] = useState("")

  // Pre-fill job description based on candidate info
  useEffect(() => {
    if (open && candidate) {
      // Generate a default job description based on candidate's profile
      const skillsList = candidate.skills?.join(", ") || "relevant technical skills"
      const level = candidate.level || "experienced"
      const targetRole = candidate.targetRole || candidate.title || "Software Engineer"
      
      const defaultJobDescription = `We are looking for a ${level} ${targetRole} to join our team.

Key Responsibilities:
- Develop and maintain high-quality software solutions
- Collaborate with cross-functional teams
- Solve complex technical problems
- Contribute to technical design and architecture decisions

Required Skills:
${candidate.skills?.map(skill => `- ${skill}`).join("\n") || "- Strong technical skills"}
- Excellent problem-solving abilities
- Strong communication skills

About the Candidate:
${candidate.bio || "Looking for a talented professional to join our team."}

This assessment will evaluate the candidate's proficiency in ${skillsList} and their ability to work effectively in a team environment.`

      setJobDescription(defaultJobDescription)
      setJobTitle(targetRole.includes("at") ? targetRole.split("at")[0].trim() : targetRole)
    }
  }, [open, candidate])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep("form")
      setJobTitle("")
      setJobDescription("")
      setTimeLimit(60)
      setGeneratedAssessment(null)
      setCreatedSession(null)
      setError("")
    }
  }, [open])

  const handleGenerateAssessment = async () => {
    if (!jobTitle || !jobDescription) {
      setError("Please provide a job title and description")
      return
    }

    setIsGenerating(true)
    setError("")
    setStep("generating")

    try {
      const response = await api.post("/api/assessments/generate", {
        jobTitle,
        jobDescription,
        company: user?.company || "Your Company",
        sourceType: "manual",
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedAssessment(data.data)
        // Automatically create session and invite candidate
        await handleCreateSessionAndInvite(data.data.assessmentId)
      } else {
        setError(data.error || "Failed to generate assessment")
        setStep("form")
      }
    } catch (err: any) {
      console.error("Error generating assessment:", err)
      setError(err.message || "Failed to generate assessment")
      setStep("form")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateSessionAndInvite = async (assessmentId: string) => {
    setIsCreating(true)
    setStep("creating")
    setError("")

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // Default 24 hours expiry

      const response = await api.post("/api/sessions", {
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        assessment_id: assessmentId,
        time_limit: timeLimit * 60,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })

      const data = await response.json()

      if (data.success) {
        setCreatedSession({
          ...data.data,
          assessmentUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${data.data.sessionCode}`,
        })
        setStep("success")
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(data.error || "Failed to create session and send invitation")
        setStep("form")
      }
    } catch (err: any) {
      console.error("Error creating session:", err)
      setError(err.message || "Failed to create session and send invitation")
      setStep("form")
    } finally {
      setIsCreating(false)
    }
  }

  if (step === "success" && createdSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Assessment Generated & Invitation Sent!
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              A personalized assessment has been generated for {candidate.name} and an invitation has been sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300 mb-2 block">Assessment Title</Label>
              <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-3">
                <p className="text-white">{jobTitle}</p>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-300 text-lg font-semibold mb-2">
                Email Sent Successfully!
              </p>
              <p className="text-zinc-400 text-sm">
                The assessment invitation has been sent to <strong>{candidate.email}</strong>. 
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
                onClick={() => onOpenChange(false)}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Generate Assessment for {candidate.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a personalized assessment based on {candidate.name}'s skills and career goals. The candidate will be automatically invited once the assessment is generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate Info Preview */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <Label className="text-zinc-300 mb-2 block">Candidate Profile</Label>
            <div className="space-y-2 text-sm">
              <p className="text-white"><strong>Name:</strong> {candidate.name}</p>
              <p className="text-zinc-300"><strong>Role:</strong> {candidate.title || "N/A"}</p>
              {candidate.skills && candidate.skills.length > 0 && (
                <p className="text-zinc-300"><strong>Skills:</strong> {candidate.skills.join(", ")}</p>
              )}
              {candidate.targetRole && (
                <p className="text-zinc-300"><strong>Target Role:</strong> {candidate.targetRole}</p>
              )}
            </div>
          </div>

          {/* Job Title */}
          <div>
            <Label htmlFor="jobTitle" className="text-zinc-300">
              Job Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              className="bg-zinc-950 border-zinc-800 text-white"
              required
            />
          </div>

          {/* Job Description */}
          <div>
            <Label htmlFor="jobDescription" className="text-zinc-300">
              Job Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Enter job description..."
              rows={12}
              className="bg-zinc-950 border-zinc-800 text-white"
              required
            />
            <p className="text-xs text-zinc-500 mt-2">
              This description has been pre-filled based on the candidate's profile. You can modify it to better match your requirements.
            </p>
          </div>

          {/* Time Limit */}
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              disabled={isGenerating || isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAssessment}
              disabled={isGenerating || isCreating || !jobTitle || !jobDescription}
              className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              {isGenerating || isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isGenerating ? "Generating Assessment..." : "Creating Session & Sending Invitation..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate & Invite
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

