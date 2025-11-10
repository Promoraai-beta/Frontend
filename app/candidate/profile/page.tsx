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
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { API_BASE_URL } from "@/lib/config"
import { ImageCropModal } from "@/components/image-crop-modal"
import { 
  Loader2, 
  Save, 
  User, 
  MapPin, 
  Briefcase, 
  Target, 
  Sparkles, 
  X,
  CheckCircle,
  AlertCircle,
  Award,
  Heart,
  Upload,
  Camera,
  FileText,
  Building2
} from "lucide-react"

export default function CandidateProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadProfile()
  }, [user])

  // Reset image error when avatar changes
  useEffect(() => {
    setImageError(false)
  }, [avatar])

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
        // Add cache buster to ensure fresh image loads
        if (avatarUrl) {
          setAvatar(`${avatarUrl}?t=${Date.now()}`)
        } else {
          setAvatar(null)
        }
        setImageError(false) // Reset error state when loading new avatar
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear previous errors
    setError("")
    setSuccess("")

    // Validate file type - only allow specific image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    // Check MIME type
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
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setError(`Image size is too large (${fileSizeMB} MB). Please upload an image smaller than 5MB.`)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    // Validate file extension as additional check
    const fileName = file.name || ''
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Invalid file extension. Please upload an image in JPG, PNG, GIF, or WEBP format.`)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }
    
    // All validations passed - proceed with crop modal
    try {
      // Create object URL for the image to show in crop modal
      const imageUrl = URL.createObjectURL(file)
      setImageToCrop(imageUrl)
      setShowCropModal(true)
    } catch (err: any) {
      console.error("Error creating image preview:", err)
      setError("Failed to load image. Please try again with a different image.")
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setUploadingAvatar(true)
    setShowCropModal(false)
    
    // Clean up the object URL
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
    }

    try {
      // Create FormData with the cropped image
      const formData = new FormData()
      formData.append("image", croppedImageBlob, "profile-image.png")

      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const response = await fetch(`${API_BASE_URL}/api/uploads/profile-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        // Get the URL without cache buster for saving to database
        const imageUrl = data.data.url
        // Set avatar with cache buster for immediate display
        setAvatar(`${imageUrl}?t=${Date.now()}`)
        setImageError(false) // Reset error state
        
        // Auto-save the avatar URL to database immediately
        try {
          console.log("💾 Auto-saving avatar URL to database:", imageUrl)
          console.log("💾 Full imageUrl value:", JSON.stringify(imageUrl))
          
          const saveResponse = await api.put("/api/profiles/candidate", {
            avatar: imageUrl // Save without cache buster
          })
          
          console.log("💾 Save response status:", saveResponse.status)
          
          const saveData = await saveResponse.json()
          
          console.log("💾 Save response data:", JSON.stringify(saveData, null, 2))
          
          if (saveData.success) {
            console.log("✅ Avatar URL saved successfully to database")
            console.log("✅ Saved avatar URL:", saveData.data?.avatar)
            // Update local state with the saved URL (from response if available)
            if (saveData.data?.avatar) {
              setAvatar(`${saveData.data.avatar}?t=${Date.now()}`)
            } else {
              // If response doesn't have avatar, use the one we just saved
              setAvatar(`${imageUrl}?t=${Date.now()}`)
            }
            setSuccess("Profile picture updated successfully!")
            setTimeout(() => setSuccess(""), 3000)
          } else {
            console.error("❌ Failed to save avatar URL:", saveData.error)
            console.error("❌ Full error response:", JSON.stringify(saveData, null, 2))
            setError(`Image uploaded but failed to save: ${saveData.error || 'Unknown error'}. Please try saving again.`)
          }
        } catch (saveErr: any) {
          console.error("❌ Error auto-saving avatar:", saveErr)
          console.error("❌ Error details:", {
            message: saveErr.message,
            stack: saveErr.stack,
            response: saveErr.response
          })
          // Show error to user so they know to manually save
          setError("Image uploaded but auto-save failed. Please click 'Save All Changes' to save the image.")
          setTimeout(() => setError(""), 5000)
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

  const handleCropCancel = () => {
    setShowCropModal(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      // Remove cache buster from avatar URL before saving
      const avatarUrlToSave = avatar ? avatar.split('?')[0] : null
      
      console.log("💾 Saving profile with avatar URL:", avatarUrlToSave)
      
      const response = await api.put("/api/profiles/candidate", {
        title: title || null,
        location: location || null,
        bio: bio || null,
        avatar: avatarUrlToSave,
        skills: skills.length > 0 ? skills : null,
        interests: interests.length > 0 ? interests : null,
        targetRole: targetRole || null
      })

      const data = await response.json()
      
      console.log("💾 Save profile response:", data)

      if (data.success) {
        // Update avatar with the saved URL from response
        if (data.data?.avatar) {
          setAvatar(`${data.data.avatar}?t=${Date.now()}`)
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

            {/* Hero Profile Header */}
            <Card className="bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-900/90 border-zinc-800/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-zinc-900/50" />
              <CardContent className="relative p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                  {/* Profile Avatar Section */}
                  <div className="flex flex-col items-center gap-4">
                    {/* Avatar Circle */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-zinc-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                      <div 
                        className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-zinc-700/50 bg-zinc-900 overflow-hidden shadow-2xl ${isEditing && !uploadingAvatar ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => isEditing && !uploadingAvatar && fileInputRef.current?.click()}
                      >
                        {avatar && !imageError ? (
                          <img 
                            src={avatar} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                            onLoad={() => setImageError(false)}
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
                    
                    {/* Upload Button and Info */}
                    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        variant="outline"
                        className="w-full border-zinc-700 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                        size="sm"
                      >
                        {uploadingAvatar ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {avatar ? "Change Picture" : "Upload Picture"}
                          </>
                        )}
                      </Button>
                      {isEditing && (
                        <p className="text-xs text-zinc-500 text-center">
                          Supported formats: JPG, PNG, GIF, WEBP. Max size 5MB
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {user?.name || "Your Name"}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-400">
                        {title && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span className="text-sm">{title}</span>
                          </div>
                        )}
                        {location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {bio && (
                      <p className="text-zinc-300 text-sm md:text-base leading-relaxed max-w-2xl">
                        {bio}
                      </p>
                    )}
                    {!bio && (
                      <p className="text-zinc-500 text-sm italic">Add a bio to tell others about yourself</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <User className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
              <CardTitle className="text-white">Personal Information</CardTitle>
              <CardDescription className="text-zinc-400">
                          Your basic profile details
              </CardDescription>
                      </div>
                    </div>
            </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-200 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Current Job Title
                  </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  <Input
                    id="title"
                    type="text"
                    placeholder="Software Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isEditing}
                    className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                  />
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
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            disabled={!isEditing}
                            className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-emerald-500/50 pl-10 disabled:opacity-70"
                          />
                        </div>
                      </div>
                </div>

                <div className="space-y-2">
                      <Label htmlFor="bio" className="text-zinc-200 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Bio
                  </Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself, your experience, and what makes you unique..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={!isEditing}
                        rows={5}
                        className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 resize-none focus:border-emerald-500/50 disabled:opacity-70"
                      />
                </div>
                  </CardContent>
                </Card>

                {/* Skills & Expertise Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Award className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Skills & Expertise</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Showcase your technical and professional skills
                        </CardDescription>
                </div>
              </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  <Input
                    type="text"
                          placeholder="Add a skill (e.g., React, Python, TypeScript)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && isEditing) {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    disabled={!isEditing}
                    className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-blue-500/50 pl-10 disabled:opacity-70"
                  />
                      </div>
                      <Button
                        type="button"
                        onClick={addSkill}
                        disabled={!isEditing}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                </div>
                    <div className="flex flex-wrap gap-2 min-h-[3rem]">
                      {skills.length > 0 ? (
                        skills.map((skill) => (
                    <span
                      key={skill}
                            className="group px-4 py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-300 rounded-lg text-sm flex items-center gap-2 border border-blue-500/30 hover:border-blue-500/50 transition-all cursor-default"
                    >
                      {skill}
                      {isEditing && (
                        <button
                          onClick={() => removeSkill(skill)}
                                className="text-blue-400 hover:text-red-400 transition-colors"
                                aria-label={`Remove ${skill}`}
                        >
                                <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-sm italic">No skills added yet. Add your first skill above!</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Career Goals Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <Target className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Career Goals</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Define your target role and career aspirations
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="targetRole" className="text-zinc-200 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Target Role
                      </Label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <Input
                          id="targetRole"
                          type="text"
                          placeholder="Senior Frontend Developer, Full-Stack Engineer, etc."
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          disabled={!isEditing}
                          className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-purple-500/50 pl-10 disabled:opacity-70"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        This helps us match you with relevant assessments
                      </p>
                </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Interests & Actions */}
              <div className="space-y-6">
                {/* Interests Card */}
                <Card className="bg-zinc-950/80 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                        <Heart className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Interests</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Testing preferences
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                <p className="text-xs text-zinc-500">
                  What kind of environments or challenges do you want to test yourself in?
                </p>
                <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="e.g., Frontend, Algorithms"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && isEditing) {
                              e.preventDefault()
                              addInterest()
                            }
                          }}
                          disabled={!isEditing}
                          className="border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-500 focus:border-pink-500/50 text-sm pl-10 disabled:opacity-70"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={addInterest}
                        disabled={!isEditing}
                        className="shrink-0 bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                </div>
                    <div className="flex flex-wrap gap-2 min-h-[3rem]">
                      {interests.length > 0 ? (
                        interests.map((interest) => (
                    <span
                      key={interest}
                            className="group px-3 py-1.5 bg-gradient-to-r from-pink-500/10 to-pink-600/10 text-pink-300 rounded-lg text-sm flex items-center gap-2 border border-pink-500/30 hover:border-pink-500/50 transition-all cursor-default"
                    >
                      {interest}
                      {isEditing && (
                        <button
                          onClick={() => removeInterest(interest)}
                                className="text-pink-400 hover:text-red-400 transition-colors"
                                aria-label={`Remove ${interest}`}
                        >
                                <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-xs italic">No interests added yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats Card */}
                <Card className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border-zinc-800/50 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Profile Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-blue-400" />
                        <span className="text-zinc-300 text-sm">Skills</span>
                      </div>
                      <span className="text-white font-semibold">{skills.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Heart className="h-5 w-5 text-pink-400" />
                        <span className="text-zinc-300 text-sm">Interests</span>
                      </div>
                      <span className="text-white font-semibold">{interests.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-purple-400" />
                        <span className="text-zinc-300 text-sm">Target Role</span>
                </div>
                      <span className="text-white font-semibold">{targetRole ? "Set" : "Not set"}</span>
              </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          shape="round"
        />
      )}
    </ProtectedRoute>
  )
}
