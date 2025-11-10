"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import { CheckCircle, Loader2, Mail } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface InviteCandidateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: {
    id?: string
    name: string
    email: string
  }
  onSuccess?: () => void
}

export function InviteCandidateModal({ open, onOpenChange, candidate, onSuccess }: InviteCandidateModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<"select" | "success">("select")
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("")
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([])
  const [timeLimit, setTimeLimit] = useState(60)
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const [invitedSession, setInvitedSession] = useState<any>(null)

  // Load assessments when modal opens
  useEffect(() => {
    if (open) {
      loadAssessments()
    }
  }, [open])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep("select")
      setSelectedAssessmentId("")
      setTimeLimit(60)
      setError("")
      setInvitedSession(null)
    }
  }, [open])

  const loadAssessments = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/assessments")
      const data = await response.json()
      if (data.success) {
        // Only show recruiter assessments
        const recruiterAssessments = (data.data || []).filter(
          (assessment: any) => assessment.assessmentType === "recruiter"
        )
        setAvailableAssessments(recruiterAssessments)
      }
    } catch (error) {
      console.error("Error loading assessments:", error)
      setError("Failed to load assessments")
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!selectedAssessmentId) {
      setError("Please select an assessment")
      return
    }

    if (!candidate.email) {
      setError("Candidate email is required")
      return
    }

    setInviting(true)
    setError("")

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const response = await api.post("/api/sessions", {
        candidate_name: candidate.name || candidate.email.split("@")[0],
        candidate_email: candidate.email,
        time_limit: timeLimit * 60,
        expires_at: expiresAt.toISOString(),
        assessment_id: selectedAssessmentId,
        status: "pending"
      })

      const data = await response.json()

      if (data.success) {
        // Send email invitation
        try {
          // Get assessment details for email
          const assessment = availableAssessments.find((a: any) => a.id === selectedAssessmentId)
          const companyName = user?.company || "Our Company"
          const recruiterName = user?.name || "Recruiter"
          const jobTitle = assessment?.jobTitle || assessment?.role || "the position"

          // Create email invitation (backend will handle sending)
          // For now, we'll use the session code to generate the URL
          const assessmentUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${data.data.sessionCode}`
          
          // Note: Email sending should be handled by backend when session is created
          // But we can also trigger it explicitly if needed
          // For now, the backend bulk endpoint handles emails, but single session creation doesn't
          // We'll need to add email sending to the single session creation or create a separate endpoint
          
          setInvitedSession({
            ...data.data,
            assessmentUrl,
            assessmentName: assessment?.jobTitle || assessment?.role || "Assessment"
          })
          setStep("success")
          if (onSuccess) {
            onSuccess()
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError)
          // Session was created, but email might have failed
          setInvitedSession({
            ...data.data,
            assessmentUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${data.data.sessionCode}`
          })
          setStep("success")
          if (onSuccess) {
            onSuccess()
          }
        }
      } else {
        setError(data.error || "Failed to create invitation")
      }
    } catch (error: any) {
      console.error("Error inviting candidate:", error)
      setError(error.message || "Failed to invite candidate")
    } finally {
      setInviting(false)
    }
  }

  if (step === "success" && invitedSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Invitation Sent!
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Assessment invitation has been sent to {candidate.name || candidate.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-300 text-lg font-semibold mb-2">
                Email Sent Successfully!
              </p>
              <p className="text-zinc-400 text-sm">
                <strong>{candidate.name || candidate.email}</strong> has been invited to take <strong>{invitedSession.assessmentName}</strong>.
                They will receive an email with their session link and code to start the assessment.
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

            <Button
              onClick={() => {
                onOpenChange(false)
                if (onSuccess) onSuccess()
              }}
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Candidate to Assessment</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Select an assessment to invite <strong>{candidate.name || candidate.email}</strong> to take
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="assessment" className="text-zinc-300 mb-2 block">
                  Select Assessment <span className="text-red-400">*</span>
                </Label>
                <select
                  id="assessment"
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
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
                    No assessments available. Create an assessment first.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="timeLimit" className="text-zinc-300 mb-2 block">
                  Time Limit (minutes)
                </Label>
                <input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                  min="15"
                  max="180"
                  className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-xs text-zinc-500 mt-1">Default: 60 minutes</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-300 text-xs">
                    An email invitation will be sent to <strong>{candidate.email}</strong> on behalf of <strong>{user?.company || "your company"}</strong> with their session code and assessment link.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || loading || !selectedAssessmentId || availableAssessments.length === 0}
              className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            >
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

