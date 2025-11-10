"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"

export default function CreateSelfAssessmentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [createdSession, setCreatedSession] = useState<any>(null)

  // Form data
  const [preference, setPreference] = useState("")
  const [environment, setEnvironment] = useState("")
  const [difficulty, setDifficulty] = useState("Intermediate")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState(60)
  const [candidateProfile, setCandidateProfile] = useState<any>(null)

  useEffect(() => {
    loadCandidateProfile()
  }, [])

  const loadCandidateProfile = async () => {
    try {
      const response = await api.get("/api/profiles/candidate")
      const data = await response.json()
      if (data.success) {
        setCandidateProfile(data.data)
        // Pre-fill with interests if available
        if (data.data.interests && Array.isArray(data.data.interests) && data.data.interests.length > 0) {
          setPreference(data.data.interests[0])
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setGenerating(true)

    try {
      // Use candidate's preferences/interests to generate assessment
      const jobTitle = candidateProfile?.targetRole || preference || "Software Developer"
      const jobDescription = description || `Self-assessment for ${preference || environment || "coding practice"}. ${candidateProfile?.skills ? `Skills: ${Array.isArray(candidateProfile.skills) ? candidateProfile.skills.join(", ") : ""}` : ""}`

      // Generate assessment based on preferences
      const response = await api.post("/api/assessments/generate", {
        jobTitle,
        jobDescription,
        sourceType: "self-assessment"
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Create session for the candidate (authenticated, so candidateId will be auto-filled)
        const sessionResponse = await api.post("/api/sessions", {
          candidate_name: user?.name || "Self Assessment",
          candidate_email: user?.email || "",
          time_limit: timeLimit * 60,
          assessment_id: data.data.assessmentId || data.data.id,
          status: "pending"
        })

        const sessionData = await sessionResponse.json()

        if (sessionData.success) {
          // Store session data and show success screen with "Start Assessment" button
          setSuccess(true)
          // Store session code in state for the start button
          if (sessionData.data?.sessionCode) {
            setCreatedSession(sessionData.data)
          }
        } else {
          setError(sessionData.error || "Failed to create session")
        }
      } else {
        setError(data.error || "Failed to generate assessment")
      }
    } catch (err: any) {
      console.error("Error generating assessment:", err)
      setError(err.message || "Failed to generate assessment")
    } finally {
      setGenerating(false)
    }
  }

  // Get available interests from profile
  const availableInterests = candidateProfile?.interests && Array.isArray(candidateProfile.interests)
    ? candidateProfile.interests
    : []

  return (
    <div className="min-h-screen bg-black relative">
      <AnimatedBackground />
      <CandidateNavbar />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/candidate/assessments"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assessments
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Create Self Assessment</h1>
            <p className="text-zinc-400">
              Generate an assessment based on your interests and preferences
            </p>
          </div>

          {success && createdSession ? (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                      <Sparkles className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Assessment Created Successfully!</h2>
                    <p className="text-zinc-400 mb-6">Your self-assessment is ready to begin</p>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
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
                        setSuccess(false)
                        setCreatedSession(null)
                        setError("")
                        // Reset form
                        setPreference("")
                        setEnvironment("")
                        setDescription("")
                        setTimeLimit(60)
                        setDifficulty("Intermediate")
                      }}
                      variant="outline"
                      className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Create Another
                    </Button>
                    <Button
                      onClick={() => {
                        if (createdSession.sessionCode) {
                          router.push(`/assessment/${createdSession.sessionCode}`)
                        }
                      }}
                      className="flex-1 bg-white text-black hover:bg-zinc-200"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Assessment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Assessment Preferences</CardTitle>
                <CardDescription className="text-zinc-400">
                  Tell us what kind of assessment you want to take
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-6">
                  {/* Interest/Preference Selection */}
                  {availableInterests.length > 0 && (
                    <div className="space-y-2">
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
                                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="preference" className="text-zinc-300">
                      Assessment Type / Interest <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="preference"
                      type="text"
                      placeholder="e.g., Frontend Development, Algorithm Challenges, React, Python"
                      value={preference}
                      onChange={(e) => setPreference(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 text-white"
                    />
                    <p className="text-xs text-zinc-500">
                      What kind of environment or technology do you want to test yourself in?
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="environment" className="text-zinc-300">
                      Environment / Framework (Optional)
                    </Label>
                    <Input
                      id="environment"
                      type="text"
                      placeholder="e.g., React, Node.js, Python, Full-Stack"
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-zinc-300">
                      Difficulty Level
                    </Label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-800 bg-zinc-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-zinc-300">
                      Additional Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you want to practice or test (e.g., 'I want to practice React hooks and state management' or 'Algorithm problems focusing on arrays and strings')"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="bg-zinc-900 border-zinc-800 text-white resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeLimit" className="text-zinc-300">
                      Time Limit (minutes)
                    </Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="15"
                      max="180"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
                      className="bg-zinc-900 border-zinc-800 text-white"
                    />
                    <p className="text-xs text-zinc-500">Default: 60 minutes</p>
                  </div>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <Button
                    type="submit"
                    disabled={generating || !preference}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Assessment...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate & Start Assessment
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
