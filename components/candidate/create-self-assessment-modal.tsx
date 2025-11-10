"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2, Sparkles } from "lucide-react"

interface CreateSelfAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateSelfAssessmentModal({ open, onOpenChange, onSuccess }: CreateSelfAssessmentModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<"form" | "success">("form")
  
  // Form fields
  const [preference, setPreference] = useState("")
  const [environment, setEnvironment] = useState("")
  const [difficulty, setDifficulty] = useState("Intermediate")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState(60)
  
  // States
  const [isGenerating, setIsGenerating] = useState(false)
  const [candidateProfile, setCandidateProfile] = useState<any>(null)
  const [createdSession, setCreatedSession] = useState<any>(null)
  const [error, setError] = useState("")

  // Load candidate profile when modal opens
  useEffect(() => {
    if (open && user) {
      loadCandidateProfile()
    }
  }, [open, user])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep("form")
      setPreference("")
      setEnvironment("")
      setDifficulty("Intermediate")
      setDescription("")
      setTimeLimit(60)
      setError("")
      setCreatedSession(null)
    }
  }, [open])

  const loadCandidateProfile = async () => {
    try {
      const response = await api.get("/api/profiles/candidate")
      const data = await response.json()
      if (data.success && data.data) {
        setCandidateProfile(data.data)
        // Pre-fill with first interest if available
        if (data.data.interests && Array.isArray(data.data.interests) && data.data.interests.length > 0) {
          setPreference(data.data.interests[0])
        }
      }
    } catch (error) {
      console.error("Error loading candidate profile:", error)
    }
  }

  const handleCreateAssessment = async () => {
    if (!preference) {
      setError("Please enter an assessment type or interest")
      return
    }

    if (!user) {
      setError("You must be logged in to create an assessment")
      return
    }

    setError("")
    setIsGenerating(true)

    try {
      // Build job title and description from preferences
      const jobTitle = candidateProfile?.targetRole || preference || "Software Developer"
      const jobDescription = description || 
        `Self-assessment for ${preference || environment || "coding practice"}. ` +
        `Difficulty level: ${difficulty}. ` +
        (candidateProfile?.skills && Array.isArray(candidateProfile.skills) 
          ? `Skills: ${candidateProfile.skills.join(", ")}. ` 
          : "") +
        (environment ? `Environment: ${environment}. ` : "") +
        "This is a self-assessment created by the candidate for practice and skill development."

      // Generate assessment based on preferences
      const assessmentResponse = await api.post("/api/assessments/generate", {
        jobTitle,
        jobDescription,
        sourceType: "self-assessment"
      })

      const assessmentData = await assessmentResponse.json()

      if (!assessmentData.success) {
        throw new Error(assessmentData.error || "Failed to generate assessment")
      }

      if (assessmentData.data.templateBuild && assessmentData.data.templateBuild.status !== "ready") {
        throw new Error(`Template is still building (status: ${assessmentData.data.templateBuild.status}). Please wait and try again.`)
      }

      // Create session for the candidate (authenticated, so candidateId will be auto-filled)
      const sessionResponse = await api.post("/api/sessions", {
        candidate_name: user.name || "Self Assessment",
        candidate_email: user.email || "",
        time_limit: timeLimit * 60,
        assessment_id: assessmentData.data.assessmentId || assessmentData.data.id,
        status: "pending"
      })

      const sessionData = await sessionResponse.json()

      if (!sessionData.success) {
        throw new Error(sessionData.error || "Failed to create session")
      }

      // Success - show success screen with "Start Assessment" button
      setCreatedSession(sessionData.data)
      setStep("success")
      if (onSuccess) {
        onSuccess()
      }

    } catch (err: any) {
      console.error("Error creating self-assessment:", err)
      setError(err.message || "Failed to create assessment. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Get available interests from profile
  const availableInterests = candidateProfile?.interests && Array.isArray(candidateProfile.interests)
    ? candidateProfile.interests
    : []

  const handleStartAssessment = () => {
    if (createdSession?.sessionCode) {
      router.push(`/assessment/${createdSession.sessionCode}`)
      onOpenChange(false)
    }
  }

  // Check if user is authenticated
  if (!user && open) {
    // If modal is opened but user is not authenticated, redirect to login
    // This should not happen if button checks authentication, but just in case
    return null
  }

  // Show success screen
  if (step === "success" && createdSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-950 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              Assessment Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Your self-assessment is ready to begin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
              <Sparkles className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-300 text-lg font-semibold mb-2">
                Assessment Ready!
              </p>
              <p className="text-zinc-400 text-sm">
                Your personalized assessment has been generated and is ready to start.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm font-medium mb-2">
                📋 What to Expect:
              </p>
              <ul className="text-zinc-400 text-sm space-y-1 ml-4">
                <li>• Coding challenges based on your preferences</li>
                <li>• Time limit: {createdSession.time_limit ? Math.floor(createdSession.time_limit / 60) : createdSession.timeLimit ? Math.floor(createdSession.timeLimit / 60) : timeLimit} minutes</li>
                <li>• AI assistant available for help</li>
                <li>• Real-time feedback and results</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep("form")
                  setCreatedSession(null)
                  onOpenChange(false)
                }}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Create Another
              </Button>
              <Button
                onClick={handleStartAssessment}
                className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Create Self Assessment</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Generate a personalized assessment based on your interests and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interest/Preference Selection from Profile */}
          {availableInterests.length > 0 && (
            <div className="space-y-3 border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
              <Label className="text-zinc-300">Choose from Your Interests</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableInterests.map((interest: string) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => setPreference(interest)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      preference === interest
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assessment Type / Interest */}
          <div className="space-y-2">
            <Label htmlFor="preference" className="text-zinc-300">
              Assessment Type / Interest <span className="text-red-400">*</span>
            </Label>
            <Input
              id="preference"
              type="text"
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              placeholder="e.g., Frontend Development, Algorithm Challenges, React, Python"
              className="bg-zinc-900 text-white border-zinc-700"
              required
            />
            <p className="text-xs text-zinc-500">
              What kind of environment or technology do you want to test yourself in?
            </p>
          </div>

          {/* Environment / Framework */}
          <div className="space-y-2">
            <Label htmlFor="environment" className="text-zinc-300">
              Environment / Framework (Optional)
            </Label>
            <Input
              id="environment"
              type="text"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="e.g., React, Node.js, Python, Full-Stack"
              className="bg-zinc-900 text-white border-zinc-700"
            />
            <p className="text-xs text-zinc-500">
              Specify a technology to tailor the assessment
            </p>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-zinc-300">
              Difficulty Level
            </Label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Additional Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any specific topics or requirements you want to include? (e.g., 'I want to practice React hooks and state management')"
              rows={3}
              className="bg-zinc-900 text-white border-zinc-700 resize-none"
            />
          </div>

          {/* Time Limit */}
          <div className="space-y-2">
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
              className="bg-zinc-900 text-white border-zinc-700"
            />
            <p className="text-xs text-zinc-500">Default: 60 minutes</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            onClick={handleCreateAssessment}
            disabled={isGenerating || !preference}
            className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Assessment & Building IDE Template...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Assessment
              </>
            )}
          </Button>
          {isGenerating && (
            <p className="text-xs text-zinc-400 text-center">
              ⏳ This may take a minute - building the IDE template...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

