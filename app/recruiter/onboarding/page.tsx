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
import { Loader2 } from "lucide-react"

export default function RecruiterOnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)

  // Personal info
  const [position, setPosition] = useState("")
  const [department, setDepartment] = useState("")
  
  // Company info
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [description, setDescription] = useState("")

  // Load existing profile if available
  useEffect(() => {
    if (user && user.role === "recruiter") {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const response = await api.get("/api/profiles/recruiter")
      const data = await response.json()
      if (data.success && data.data) {
        setPosition(data.data.position || "")
        setDepartment(data.data.department || "")
        if (data.data.company) {
          setCompanyName(data.data.company.name || "")
          setIndustry(data.data.company.industry || "")
          setCompanySize(data.data.company.size || "")
          setLocation(data.data.company.location || "")
          setWebsite(data.data.company.website || "")
          setDescription(data.data.company.description || "")
        }
        // If onboarding already completed, redirect to dashboard
        if (data.data.onboardingCompleted) {
          router.push("/dashboard")
        }
      }
    } catch (err) {
      console.error("Error loading recruiter profile:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Update recruiter profile with company details
      const response = await api.put("/api/profiles/recruiter", {
        position,
        department,
        company: {
          name: companyName,
          industry: industry || undefined,
          size: companySize || undefined,
          location: location || undefined,
          website: website || undefined,
          description: description || undefined
        },
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
        
        // Redirect to recruiter dashboard
        router.push("/dashboard")
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
            Step {step} of 2: {step === 1 ? "Personal Information" : "Company Information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-zinc-200">
                  Position / Job Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="position"
                  type="text"
                  placeholder="Talent Acquisition Manager"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-zinc-200">
                  Department (Optional)
                </Label>
                <Input
                  id="department"
                  type="text"
                  placeholder="Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="button"
                onClick={() => {
                  if (!position) {
                    setError("Please enter your position")
                    return
                  }
                  setStep(2)
                  setError("")
                }}
                disabled={loading || !position}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Next: Company Information
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-zinc-200">
                  Company Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-zinc-200">
                    Industry (Optional)
                  </Label>
                  <Input
                    id="industry"
                    type="text"
                    placeholder="Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-zinc-200">
                    Company Size (Optional)
                  </Label>
                  <Input
                    id="companySize"
                    type="text"
                    placeholder="500-1000 employees"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                  />
                </div>
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
                <Label htmlFor="website" className="text-zinc-200">
                  Website (Optional)
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-200">
                  Company Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your company..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setError("")
                  }}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !companyName}
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
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

