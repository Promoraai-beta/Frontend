"use client"

import { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { waitForSessionEnvironmentReady } from "@/lib/provisionSessionEnvironment"
import { CheckCircle, Copy, ExternalLink, Loader2, Sparkles, Mail } from "lucide-react"
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
  const [step, setStep] = useState<"form" | "generating" | "creating" | "provisioning" | "success">("form")
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [provisionContext, setProvisionContext] = useState<{
    sessionId: string
    assessmentId: string
    base: Record<string, unknown>
  } | null>(null)
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
      setProvisionError(null)
      setProvisionContext(null)
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
        const sc = data.data.sessionCode
        const fromApi = data.data.assessmentUrl as string | undefined
        const base = {
          ...data.data,
          emailDelivered: data.data.emailDelivered === true,
          assessmentUrl:
            fromApi ||
            `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${sc}`,
        }
        const sid = data.data.id as string
        flushSync(() => {
          setProvisionError(null)
          setProvisionContext({ sessionId: sid, assessmentId, base })
          setStep("provisioning")
        })
        setIsCreating(false)
        try {
          await waitForSessionEnvironmentReady({ sessionId: sid, assessmentId })
          setCreatedSession(base)
          setStep("success")
          setProvisionContext(null)
          onSuccess?.()
        } catch (e: unknown) {
          setProvisionError(e instanceof Error ? e.message : "Environment failed to start")
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

  const retryGenerateProvision = async () => {
    if (!provisionContext) return
    setProvisionError(null)
    try {
      await waitForSessionEnvironmentReady({
        sessionId: provisionContext.sessionId,
        assessmentId: provisionContext.assessmentId,
      })
      setCreatedSession(provisionContext.base)
      setStep("success")
      setProvisionContext(null)
      onSuccess?.()
    } catch (e: unknown) {
      setProvisionError(e instanceof Error ? e.message : "Environment failed to start")
    }
  }

  if (step === "provisioning") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Preparing assessment environment</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Starting the code workspace. This can take 30–90 seconds on cloud hosting.
            </DialogDescription>
          </DialogHeader>
          {!provisionError ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              <p className="text-sm text-zinc-400 text-center">Keep this window open until the link appears.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-400">{provisionError}</p>
              <div className="flex gap-2">
                <Button type="button" onClick={retryGenerateProvision} className="flex-1">
                  Retry
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  if (step === "success" && createdSession) {
    const url = createdSession.assessmentUrl as string
    const code = createdSession.sessionCode as string
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Session ready — share with {candidate.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Copy the link and session code below for {candidate.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300 mb-2 block">Assessment</Label>
              <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-3">
                <p className="text-white">{jobTitle}</p>
              </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-900/80 rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Assessment link</Label>
                <code className="mt-1 block text-xs text-emerald-300/95 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 break-all">
                  {url}
                </code>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => navigator.clipboard.writeText(url)}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Session code</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-sm font-mono text-white bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">{code}</code>
                  <Button type="button" variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {createdSession.emailDelivered ? (
              <p className="text-zinc-500 text-xs">An email was also sent with this link and code.</p>
            ) : (
              <p className="text-amber-500/90 text-xs">Server email is not configured — share the link and code manually.</p>
            )}

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            >
              Done
            </Button>
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

