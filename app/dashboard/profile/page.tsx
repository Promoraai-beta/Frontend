"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { API_BASE_URL } from "@/lib/config"
import { ImageCropModal } from "@/components/image-crop-modal"
import { 
  Loader2, 
  Save, 
  User, 
  Briefcase, 
  Building2,
  X,
  CheckCircle,
  AlertCircle,
  Camera,
  MapPin,
  Globe,
  FileText,
  Users,
} from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarCropModal, setShowAvatarCropModal] = useState(false)
  const [avatarImageToCrop, setAvatarImageToCrop] = useState<string | null>(null)
  const [avatarImageError, setAvatarImageError] = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showLogoCropModal, setShowLogoCropModal] = useState(false)
  const [logoImageToCrop, setLogoImageToCrop] = useState<string | null>(null)
  const [logoImageError, setLogoImageError] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user && user.role === "recruiter") {
      loadProfile()
    }
  }, [user])

  // Reset image errors when images change
  useEffect(() => {
    setAvatarImageError(false)
  }, [avatar])

  useEffect(() => {
    setLogoImageError(false)
  }, [companyData.logo])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError("")
      
      const response = await api.get("/api/profiles/recruiter")
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        setError(errorData.error || `Failed to load profile (${response.status})`)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        setPosition(data.data.position || "")
        setDepartment(data.data.department || "")
        const avatarUrl = data.data.avatar || null
        if (avatarUrl) {
          setAvatar(`${avatarUrl}?t=${Date.now()}`)
        } else {
          setAvatar(null)
        }
        setAvatarImageError(false)
        
        if (data.data.company) {
          const logoUrl = data.data.company.logo || ""
          setCompanyData({
            name: data.data.company.name || "",
            industry: data.data.company.industry || "",
            size: data.data.company.size || "",
            location: data.data.company.location || "",
            website: data.data.company.website || "",
            description: data.data.company.description || "",
            logo: logoUrl ? `${logoUrl}?t=${Date.now()}` : ""
          })
          setLogoImageError(false)
        }
      } else {
        setError(data.error || "Failed to load profile data")
      }
    } catch (err: any) {
      console.error("Error loading profile:", err)
      setError(err.message || "Failed to load profile. Please check if the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setSuccess("")

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      const fileName = file.name || 'file'
      const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      let errorMessage = "Invalid image format. "
      if (allowedExtensions.includes(fileExtension)) {
        errorMessage += `The file "${fileName}" appears to be corrupted or in an unsupported format.`
      } else {
        errorMessage += `"${fileName}" is not a supported image format.`
      }
      errorMessage += ` Please upload an image in one of these formats: JPG, PNG, GIF, or WEBP.`
      setError(errorMessage)
      if (avatarFileInputRef.current) { avatarFileInputRef.current.value = "" }
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setError(`Image size is too large (${fileSizeMB} MB). Please upload an image smaller than 5MB.`)
      if (avatarFileInputRef.current) { avatarFileInputRef.current.value = "" }
      return
    }

    const fileName = file.name || ''
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file extension. Please upload an image in JPG, PNG, GIF, or WEBP format.`)
      if (avatarFileInputRef.current) { avatarFileInputRef.current.value = "" }
      return
    }
    
    try {
      const imageUrl = URL.createObjectURL(file)
      setAvatarImageToCrop(imageUrl)
      setShowAvatarCropModal(true)
    } catch (err: any) {
      console.error("Error creating image preview:", err)
      setError("Failed to load image. Please try again with a different image.")
    }
    if (avatarFileInputRef.current) { avatarFileInputRef.current.value = "" }
  }

  const handleAvatarCropComplete = async (croppedImageBlob: Blob) => {
    setUploadingAvatar(true)
    setShowAvatarCropModal(false)
    if (avatarImageToCrop) { URL.revokeObjectURL(avatarImageToCrop); setAvatarImageToCrop(null) }

    try {
      const formData = new FormData()
      formData.append("image", croppedImageBlob, "profile-image.png")

      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const response = await fetch(`${API_BASE_URL}/api/uploads/profile-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        const imageUrl = data.data.url
        setAvatar(`${imageUrl}?t=${Date.now()}`)
        setAvatarImageError(false)
        
        // Auto-save the avatar URL to database immediately
        try {
          console.log("💾 Auto-saving avatar URL to database:", imageUrl)
          const saveResponse = await api.put("/api/profiles/recruiter", {
            avatar: imageUrl,
            position,
            department,
            company: companyData
          })
          const saveData = await saveResponse.json()
          
          if (saveData.success) {
            console.log("✅ Avatar URL saved successfully to database")
            setSuccess("Profile picture updated successfully!")
            setTimeout(() => setSuccess(""), 3000)
          } else {
            setError("Image uploaded but failed to save. Please try saving again.")
          }
        } catch (saveErr: any) {
          console.error("❌ Error auto-saving avatar:", saveErr)
          setSuccess("Profile picture uploaded! Click 'Save All Changes' to persist.")
          setTimeout(() => setSuccess(""), 5000)
        }
      } else {
        setError(data.error || "Failed to upload image")
      }
    } catch (err: any) {
      console.error("Error uploading image:", err)
      setError(err.message || "Failed to upload image")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarCropCancel = () => {
    setShowAvatarCropModal(false)
    if (avatarImageToCrop) { URL.revokeObjectURL(avatarImageToCrop); setAvatarImageToCrop(null) }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setSuccess("")

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      const fileName = file.name || 'file'
      const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      let errorMessage = "Invalid image format. "
      if (allowedExtensions.includes(fileExtension)) {
        errorMessage += `The file "${fileName}" appears to be corrupted or in an unsupported format.`
      } else {
        errorMessage += `"${fileName}" is not a supported image format.`
      }
      errorMessage += ` Please upload an image in one of these formats: JPG, PNG, GIF, or WEBP.`
      setError(errorMessage)
      if (logoFileInputRef.current) { logoFileInputRef.current.value = "" }
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setError(`Image size is too large (${fileSizeMB} MB). Please upload an image smaller than 5MB.`)
      if (logoFileInputRef.current) { logoFileInputRef.current.value = "" }
      return
    }

    const fileName = file.name || ''
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file extension. Please upload an image in JPG, PNG, GIF, or WEBP format.`)
      if (logoFileInputRef.current) { logoFileInputRef.current.value = "" }
      return
    }
    
    try {
      const imageUrl = URL.createObjectURL(file)
      setLogoImageToCrop(imageUrl)
      setShowLogoCropModal(true)
    } catch (err: any) {
      console.error("Error creating image preview:", err)
      setError("Failed to load image. Please try again with a different image.")
    }
    if (logoFileInputRef.current) { logoFileInputRef.current.value = "" }
  }

  const handleLogoCropComplete = async (croppedImageBlob: Blob) => {
    setUploadingLogo(true)
    setShowLogoCropModal(false)
    if (logoImageToCrop) { URL.revokeObjectURL(logoImageToCrop); setLogoImageToCrop(null) }

    try {
      const formData = new FormData()
      formData.append("image", croppedImageBlob, "company-logo.png")

      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const response = await fetch(`${API_BASE_URL}/api/uploads/company-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        const imageUrl = data.data.url
        setCompanyData({ ...companyData, logo: `${imageUrl}?t=${Date.now()}` })
        setLogoImageError(false)
        setSuccess("Company logo updated successfully!")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to upload logo")
      }
    } catch (err: any) {
      console.error("Error uploading logo:", err)
      setError(err.message || "Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoCropCancel = () => {
    setShowLogoCropModal(false)
    if (logoImageToCrop) { URL.revokeObjectURL(logoImageToCrop); setLogoImageToCrop(null) }
  }

  const handleSave = async () => {
      setSaving(true)
      setError("")
      setSuccess("")

    try {
      // Remove cache buster from avatar URL before saving
      const avatarUrlToSave = avatar ? avatar.split('?')[0] : null
      const logoUrlToSave = companyData.logo ? companyData.logo.split('?')[0] : null
      
      console.log("💾 Saving profile with avatar URL:", avatarUrlToSave)

      const response = await api.put("/api/profiles/recruiter", {
        position: position || null,
        department: department || null,
        avatar: avatarUrlToSave,
        company: {
          name: companyData.name || null,
          industry: companyData.industry || null,
          size: companyData.size || null,
          location: companyData.location || null,
          website: companyData.website || null,
          description: companyData.description || null,
          logo: logoUrlToSave || null
        }
      })

      const data = await response.json()
      
      console.log("💾 Save profile response:", data)

      if (data.success) {
        // Update avatar and logo with the saved URLs from response
        if (data.data?.avatar) {
          setAvatar(`${data.data.avatar}?t=${Date.now()}`)
        }
        if (data.data?.company?.logo) {
          setCompanyData({ ...companyData, logo: `${data.data.company.logo}?t=${Date.now()}` })
        }
        setIsEditing(false)
        setSuccess("Profile updated successfully!")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError(data.error || "Failed to update profile")
      }
    } catch (err: any) {
      console.error("❌ Error saving profile:", err)
      setError(err.message || "Failed to update profile. Please try again.")
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
        <div className="min-h-screen bg-black relative">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="relative z-10 container mx-auto px-4 py-24 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="relative z-10 container mx-auto px-4 pt-16 pb-8 md:pt-24 md:pb-12 lg:pt-32 lg:pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Success/Error Messages */}
            {success && (
              <Card className="border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
                <CardContent className="pt-6 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-300 flex-shrink-0" />
                  <p className="text-emerald-300">{success}</p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                <CardContent className="pt-6 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Edit Button */}
            <div className="flex justify-end">
                {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                    disabled={saving}
                  >
                      Cancel
                    </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  </div>
                )}
              </div>

            {/* Hero Profile Header - Two Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recruiter Section */}
              <Card className="bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 border-zinc-800/50 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-zinc-900/50" />
                <CardContent className="relative p-6 md:p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Profile Avatar */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-zinc-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div 
                        className={`relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-zinc-700/50 bg-zinc-900 overflow-hidden shadow-2xl ${isEditing && !uploadingAvatar ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isEditing && !uploadingAvatar && avatarFileInputRef.current?.click()}
                      >
                        {avatar && !avatarImageError ? (
                          <img 
                            src={avatar} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={() => setAvatarImageError(true)}
                            onLoad={() => setAvatarImageError(false)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                            <User className="h-16 w-16 md:h-20 md:w-20 text-zinc-500" />
                          </div>
                        )}
                        {/* Upload Overlay on Hover - Only show when editing */}
                        {isEditing && !uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-white" />
                </div>
              )}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
                      </div>
                    </div>
                    
                    {/* Recruiter Info */}
                    <div className="space-y-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {user?.name || "Your Name"}
                      </h1>
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        {position && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            <span className="text-lg md:text-xl font-medium">{position}</span>
                          </div>
                        )}
                        {department && (
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <span className="text-lg md:text-xl font-medium">{department}</span>
                          </div>
                        )}
                      </div>
                </div>
                
                    {/* Hidden file input for avatar */}
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Company Section */}
              <Card className="bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 border-zinc-800/50 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-zinc-900/50" />
                <CardContent className="relative p-6 md:p-8">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Company Logo */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-zinc-500/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div 
                        className={`relative w-32 h-32 md:w-36 md:h-36 rounded-lg border-4 border-zinc-700/50 bg-zinc-900 overflow-hidden shadow-2xl ${isEditing && !uploadingLogo ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isEditing && !uploadingLogo && logoFileInputRef.current?.click()}
                      >
                        {companyData.logo && !logoImageError ? (
                          <img 
                            src={companyData.logo} 
                            alt="Company Logo" 
                            className="w-full h-full object-cover"
                            onError={() => setLogoImageError(true)}
                            onLoad={() => setLogoImageError(false)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                            <Building2 className="h-16 w-16 md:h-20 md:w-20 text-zinc-500" />
                          </div>
                        )}
                        {/* Upload Overlay on Hover - Only show when editing */}
                        {isEditing && !uploadingLogo && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-white" />
                          </div>
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Company Info */}
                  <div className="space-y-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {companyData.name || "Company Name"}
                      </h1>
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        {companyData.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            <span className="text-lg md:text-xl font-medium">{companyData.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Hidden file input for logo */}
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {isEditing && (
              <p className="text-xs text-zinc-500 text-center">
                Click on the images above to upload. Supported formats: JPG, PNG, GIF, WEBP. Max size 5MB each
              </p>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal & Company Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Personal Information</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Your professional details
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="position" className="text-zinc-200 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Position / Job Title
                        </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                          <Input
                            id="position"
                            type="text"
                            placeholder="Talent Acquisition Manager"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-blue-500/50 pl-10"
                          />
                        </div>
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="department" className="text-zinc-200 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Department
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input
                      id="department"
                            type="text"
                            placeholder="Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={!isEditing}
                            className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-blue-500/50 pl-10 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>
                  </CardContent>
                </Card>

                {/* Company Information Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Company Information</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Your company details
                        </CardDescription>
                      </div>
                </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                  <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-zinc-200 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Name
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input
                      id="companyName"
                          type="text"
                          placeholder="Acme Corp"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      disabled={!isEditing}
                          className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                    />
                      </div>
                  </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="industry" className="text-zinc-200 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Industry
                        </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <Input
                        id="industry"
                            type="text"
                            placeholder="Technology"
                        value={companyData.industry}
                        onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                        disabled={!isEditing}
                            className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                      />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="companySize" className="text-zinc-200 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Company Size
                        </Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                      <Input
                        id="companySize"
                            type="text"
                            placeholder="500-1000 employees"
                        value={companyData.size}
                        onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                        disabled={!isEditing}
                            className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                      />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="location" className="text-zinc-200 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input
                      id="location"
                          type="text"
                          placeholder="San Francisco, CA"
                      value={companyData.location}
                      onChange={(e) => setCompanyData({ ...companyData, location: e.target.value })}
                      disabled={!isEditing}
                          className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                    />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="website" className="text-zinc-200 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input
                      id="website"
                      type="url"
                          placeholder="https://company.com"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      disabled={!isEditing}
                          className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                    />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="description" className="text-zinc-200 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Company Description
                      </Label>
                    <Textarea
                      id="description"
                        placeholder="Tell us about your company..."
                      value={companyData.description}
                      onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                      disabled={!isEditing}
                        rows={5}
                        className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 resize-none focus:border-emerald-500/50 disabled:opacity-70"
                    />
                  </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-6">
                {/* Quick Stats Card */}
                <Card className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Profile Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-blue-400" />
                        <span className="text-zinc-300 text-sm">Position</span>
                      </div>
                      <span className="text-white font-semibold">{position || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-zinc-300 text-sm">Company</span>
                      </div>
                      <span className="text-white font-semibold">{companyData.name || "Not set"}</span>
              </div>
            </CardContent>
          </Card>

              </div>
            </div>
          </div>
        </div>

        {/* Avatar Crop Modal */}
        {showAvatarCropModal && avatarImageToCrop && (
          <ImageCropModal
            imageSrc={avatarImageToCrop}
            onClose={handleAvatarCropCancel}
            onCropComplete={handleAvatarCropComplete}
            aspectRatio={1}
            shape="round"
          />
        )}

        {/* Logo Crop Modal */}
        {showLogoCropModal && logoImageToCrop && (
          <ImageCropModal
            imageSrc={logoImageToCrop}
            onClose={handleLogoCropCancel}
            onCropComplete={handleLogoCropComplete}
            aspectRatio={1}
            shape="rect"
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
