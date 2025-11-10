"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Building2, Save, Loader2, User, CheckCircle } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { ProfileImageUpload } from "@/components/profile-image-upload"

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Personal info
  const [position, setPosition] = useState("")
  const [department, setDepartment] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  
  // Company info
  const [companyData, setCompanyData] = useState({
    name: "",
    industry: "",
    size: "",
    location: "",
    website: "",
    description: "",
    logo: ""
  })

  useEffect(() => {
    if (user && user.role === "recruiter") {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError("")
      
      console.log("Loading recruiter profile...")
      const response = await api.get("/api/profiles/recruiter")
      
      console.log("Profile response status:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        console.error("Profile API error:", errorData)
        setError(errorData.error || `Failed to load profile (${response.status})`)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      console.log("Profile data received:", data)
      
      if (data.success && data.data) {
        setPosition(data.data.position || "")
        setDepartment(data.data.department || "")
        setAvatar(data.data.avatar || null)
        if (data.data.company) {
          setCompanyData({
            name: data.data.company.name || "",
            industry: data.data.company.industry || "",
            size: data.data.company.size || "",
            location: data.data.company.location || "",
            website: data.data.company.website || "",
            description: data.data.company.description || "",
            logo: data.data.company.logo || ""
          })
        } else {
          // No company data - set defaults
          console.log("No company data found, using defaults")
        }
      } else {
        console.error("Profile API returned unsuccessful response:", data)
        setError(data.error || "Failed to load profile data")
      }
    } catch (err: any) {
      console.error("Error loading profile:", err)
      setError(err.message || "Failed to load profile. Please check if the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const response = await api.put("/api/profiles/recruiter", {
        position,
        department,
        avatar: avatar || undefined,
        company: {
          name: companyData.name,
          industry: companyData.industry || undefined,
          size: companyData.size || undefined,
          location: companyData.location || undefined,
          website: companyData.website || undefined,
          description: companyData.description || undefined,
          logo: companyData.logo || undefined
        }
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Profile updated successfully!")
        setIsEditing(false)
        // Reload profile to get updated data
        await loadProfile()
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (err: any) {
      console.error("Error saving profile:", err)
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError("")
    setSuccess("")
    // Reload profile to reset changes
    loadProfile()
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="container mx-auto p-4 pt-20 md:p-6 md:pt-24 lg:p-8 lg:pt-28">
            <Card className="mx-auto max-w-3xl border-zinc-800 bg-zinc-950">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["recruiter"]}>
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto p-4 pt-20 md:p-6 md:pt-24 lg:p-8 lg:pt-28">
          <Card className="mx-auto max-w-3xl border-zinc-800 bg-zinc-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white">Profile Settings</CardTitle>
                    <p className="text-sm text-zinc-400">Manage your personal and company information</p>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} className="bg-white text-black hover:bg-zinc-200">
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleCancel} variant="ghost" className="text-white" disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2 bg-white text-black hover:bg-zinc-200">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Success/Error Messages */}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{success}</span>
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <User className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                </div>
                
                {/* Profile Image Upload */}
                {isEditing && (
                  <ProfileImageUpload
                    currentImageUrl={avatar}
                    onImageUploaded={setAvatar}
                    type="recruiter"
                    label="Profile Picture"
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-zinc-200">Position / Job Title</Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Talent Acquisition Manager"
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-zinc-200">Department</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Engineering"
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <Building2 className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">Company Information</h3>
                </div>

                <div className="space-y-4">
                  {/* Company Logo Upload */}
                  {isEditing && (
                    <ProfileImageUpload
                      currentImageUrl={companyData.logo}
                      onImageUploaded={(url) => setCompanyData({ ...companyData, logo: url })}
                      type="company"
                      label="Company Logo"
                    />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-zinc-200">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Acme Corp"
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-zinc-200">Industry</Label>
                      <Input
                        id="industry"
                        value={companyData.industry}
                        onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Technology"
                        className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companySize" className="text-zinc-200">Company Size</Label>
                      <Input
                        id="companySize"
                        value={companyData.size}
                        onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                        disabled={!isEditing}
                        placeholder="500-1000 employees"
                        className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-zinc-200">Location</Label>
                    <Input
                      id="location"
                      value={companyData.location}
                      onChange={(e) => setCompanyData({ ...companyData, location: e.target.value })}
                      disabled={!isEditing}
                      placeholder="San Francisco, CA"
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-zinc-200">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      disabled={!isEditing}
                      placeholder="https://company.com"
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-zinc-200">Company Description</Label>
                    <Textarea
                      id="description"
                      value={companyData.description}
                      onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about your company..."
                      className="border-zinc-700 bg-zinc-900 text-white disabled:opacity-70 resize-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
