"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { Loader2, Save, User } from "lucide-react"
import { ProfileImageUpload } from "@/components/profile-image-upload"

export default function CandidateProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form data - only personal information
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get("/api/profiles/candidate")
      const data = await response.json()
      if (data.success && data.data) {
        setTitle(data.data.title || "")
        setLocation(data.data.location || "")
        setBio(data.data.bio || "")
        const avatarUrl = data.data.avatar || null
        console.log("Loaded avatar URL:", avatarUrl)
        setAvatar(avatarUrl)
        setSkills(Array.isArray(data.data.skills) ? data.data.skills : [])
        setTargetRole(data.data.targetRole || "")
        setInterests(Array.isArray(data.data.interests) ? data.data.interests : [])
      }
    } catch (err: any) {
      console.error("Error loading profile:", err)
      setError("Failed to load profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await api.put("/api/profiles/candidate", {
        title: title || null,
        location: location || null,
        bio: bio || null,
        avatar: avatar || null,
        skills: skills.length > 0 ? skills : null,
        interests: interests.length > 0 ? interests : null,
        targetRole: targetRole || null
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Profile updated successfully!")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (err: any) {
      console.error("Error saving profile:", err)
      setError(err.message || "Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <User className="h-8 w-8" />
              Edit Profile
            </h1>
            <p className="text-zinc-400">
              Update your personal information and preferences
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <Card className="mb-6 border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="pt-6">
                <p className="text-emerald-300">{success}</p>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="mb-6 border-red-500/30 bg-red-500/10">
              <CardContent className="pt-6">
                <p className="text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Profile Form */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
              <CardDescription className="text-zinc-400">
                Update your profile details. This information is only visible to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Upload */}
              <ProfileImageUpload
                currentImageUrl={avatar}
                onImageUploaded={setAvatar}
                type="candidate"
                label="Profile Picture"
              />

              {/* Basic Information */}
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
                    Target Role (Optional)
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
              </div>

              {/* Skills */}
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
                    className="shrink-0 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
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

              {/* Interests */}
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
                    className="shrink-0 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
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

              {/* Save Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-white text-black hover:bg-zinc-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
