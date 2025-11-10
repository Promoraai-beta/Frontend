"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2, User, Building2 } from "lucide-react"
import { api } from "@/lib/api"
import { API_BASE_URL } from "@/lib/config"
import Image from "next/image"

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  onImageUploaded: (imageUrl: string) => void
  type?: "recruiter" | "candidate" | "company"
  label?: string
}

export function ProfileImageUpload({
  currentImageUrl,
  onImageUploaded,
  type = "recruiter",
  label
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState("")
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync preview with prop changes
  useEffect(() => {
    setPreview(currentImageUrl || null)
    setImageError(false) // Reset error when URL changes
  }, [currentImageUrl])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setError("")
    setUploading(true)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append("image", file)

      // Upload to backend
      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const endpoint = type === "company" 
        ? `${API_BASE_URL}/api/uploads/company-logo`
        : `${API_BASE_URL}/api/uploads/profile-image`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.data?.url) {
        setPreview(data.data.url)
        onImageUploaded(data.data.url)
      } else {
        setError(data.error || "Failed to upload image")
      }
    } catch (err: any) {
      console.error("Error uploading image:", err)
      setError(err.message || "Failed to upload image")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onImageUploaded("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getIcon = () => {
    if (type === "company") return Building2
    return User
  }

  const getDefaultLabel = () => {
    if (type === "company") return "Company Logo"
    if (type === "candidate") return "Profile Picture"
    return "Profile Picture"
  }

  const Icon = getIcon()

  return (
    <div className="space-y-2">
      <Label className="text-zinc-200">{label || getDefaultLabel()}</Label>
      <div className="flex items-center gap-4">
        {/* Image Preview */}
        <div className="relative">
          {preview && !imageError ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-zinc-700 bg-zinc-900">
              <img
                src={preview}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => {
                  // Silently handle error and show fallback
                  setImageError(true)
                }}
                onLoad={() => {
                  setImageError(false)
                }}
              />
              <button
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white z-10"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center">
              <Icon className="h-8 w-8 text-zinc-500" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${type}`}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
            className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {preview ? "Change Image" : "Upload Image"}
              </>
            )}
          </Button>
          <p className="text-xs text-zinc-500 mt-1">
            JPG, PNG or GIF. Max size 5MB
          </p>
          {error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
