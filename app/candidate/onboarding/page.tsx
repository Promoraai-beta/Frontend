"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { Loader2 } from "lucide-react"

export default function CandidateOnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form data
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [bio, setBio] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState("")

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()])
      setInterestInput("")
    }
  }

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      // Update candidate profile with all data including interests
      const response = await api.put("/api/profiles/candidate", {
        title,
        location,
        bio,
        skills: skills.length > 0 ? skills : undefined,
        interests: interests.length > 0 ? interests : undefined,
        targetRole,
        onboardingCompleted: true
      })

      const data = await response.json()

      if (data.success) {
        // Also update user's onboarding status in auth
        const authResponse = await api.get("/api/auth/me")
        const authData = await authResponse.json()
        
        if (authData.success && authData.data) {
          setUser({
            ...user!,
            onboardingCompleted: true
          })
        }
        
        // Redirect to candidate assessments
        router.push("/candidate/assessments")
      } else {
        setError(data.error || "Failed to complete onboarding")
      }
    } catch (err: any) {
      console.error("Onboarding error:", err)
      setError(err.message || "Failed to complete onboarding")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
      <AnimatedBackground />
      <Card className="w-full max-w-2xl border-zinc-800 bg-zinc-950">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">Welcome! Let's set up your profile</CardTitle>
          <CardDescription className="text-zinc-400">
            Step {step} of 2: {step === 1 ? "Basic Information" : "Skills & Interests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-200">
                  Current Job Title (Optional)
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Software Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-zinc-200">
                  Location (Optional)
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-zinc-200">
                  Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetRole" className="text-zinc-200">
                  Target Role
                </Label>
                <Input
                  id="targetRole"
                  type="text"
                  placeholder="Senior Frontend Developer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Next: Skills & Interests
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-200">Skills</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add a skill (e.g., React, Python)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    variant="outline"
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-zinc-800 text-zinc-200 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-200">Interests / Testing Preferences</Label>
                <p className="text-xs text-zinc-500">
                  What kind of environments or challenges do you want to test yourself in?
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g., Frontend Development, Algorithm Challenges, Full-Stack"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addInterest()
                      }
                    }}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    variant="outline"
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-emerald-500/10 text-emerald-300 rounded-full text-sm flex items-center gap-2 border border-emerald-500/30"
                    >
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="text-emerald-400 hover:text-emerald-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-white text-black hover:bg-zinc-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

