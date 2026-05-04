"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { API_BASE_URL } from "@/lib/config"
import { ImageCropModal } from "@/components/image-crop-modal"
import { motion } from "framer-motion"
import {
  Loader2, Save, User, Briefcase, Building2, CheckCircle, AlertCircle,
  Camera, MapPin, Globe, FileText, Users, Edit3, X, Mail, ArrowLeft,
  Eye, Send, Plus, Check, Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { RECRUITER_DASH_MAIN_INNER } from "@/components/dashboard/editorial/dashboard-editorial-shell"

type TabId = "overview" | "personal" | "company" | "preferences"

// ── helpers ────────────────────────────────────────────────────────────────────
function AvatarBlock({ name, avatar, avatarError, isEditing, uploading, onEdit, onError, onLoad }:
  { name: string; avatar: string | null; avatarError: boolean; isEditing: boolean; uploading: boolean;
    onEdit: () => void; onError: () => void; onLoad: () => void }) {
  const parts = (name || "U").trim().split(" ")
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (name || "U").slice(0, 2)
  return (
    <div
      className={`relative group flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden flex-shrink-0 ${isEditing && !uploading ? "cursor-pointer" : ""}`}
      onClick={() => isEditing && !uploading && onEdit()}
    >
      {avatar && !avatarError ? (
        <img src={avatar} alt="Profile" className="h-full w-full object-cover"
          onError={onError} onLoad={onLoad} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700">
          <span className="text-2xl font-bold text-white">{initials.toUpperCase()}</span>
        </div>
      )}
      {isEditing && !uploading && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="h-5 w-5 text-white" />
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} type="button"
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none ${on ? "border-violet-600 bg-violet-600" : "border-zinc-700 bg-zinc-800"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  )
}

const ACTIVITY_ICONS: Record<string, any> = {
  view: Eye, invite: Send, create: Plus, complete: Check, update: FileText,
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState("")
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  // Profile data
  const [position, setPosition]   = useState("")
  const [department, setDepartment] = useState("")
  const [avatar, setAvatar]       = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarCropModal, setShowAvatarCropModal] = useState(false)
  const [avatarImageToCrop, setAvatarImageToCrop]     = useState<string | null>(null)
  const [avatarImageError, setAvatarImageError]       = useState(false)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  // Company data
  const [companyData, setCompanyData] = useState({ name: "", industry: "", size: "", location: "", website: "", description: "", logo: "" })
  const [uploadingLogo, setUploadingLogo]     = useState(false)
  const [showLogoCropModal, setShowLogoCropModal] = useState(false)
  const [logoImageToCrop, setLogoImageToCrop]     = useState<string | null>(null)
  const [logoImageError, setLogoImageError]       = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  // Stats
  const [profileStats, setProfileStats] = useState({ positionsManaged: 0, candidatesAssessed: 0, avgPromptIQ: 0, memberSince: "" })

  // Preferences (local state only — no backend yet)
  const [prefs, setPrefs] = useState({ assessmentCompleted: true, newCandidateInvited: true, weeklyDigest: true, positionDeadline: false, marketingUpdates: false })
  const togglePref = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  useEffect(() => { setAvatarImageError(false) }, [avatar])
  useEffect(() => { setLogoImageError(false) }, [companyData.logo])

  useEffect(() => {
    if (user?.role === "recruiter") loadProfile()
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true); setError("")
      const [profileRes, sessionsRes, assessmentsRes] = await Promise.all([
        api.get("/api/profiles/recruiter"),
        api.get("/api/sessions").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
        api.get("/api/assessments").then(r => r.json()).then(d => d.success ? d.data || [] : []).catch(() => []),
      ])
      if (!profileRes.ok) { setError(`Failed to load profile (${profileRes.status})`); return }
      const data = await profileRes.json()
      if (data.success && data.data) {
        setPosition(data.data.position || "")
        setDepartment(data.data.department || "")
        const av = data.data.avatar || null
        setAvatar(av ? `${av}?t=${Date.now()}` : null)
        setAvatarImageError(false)
        if (data.data.company) {
          const logoUrl = data.data.company.logo || ""
          setCompanyData({ name: data.data.company.name || "", industry: data.data.company.industry || "", size: data.data.company.size || "", location: data.data.company.location || "", website: data.data.company.website || "", description: data.data.company.description || "", logo: logoUrl ? `${logoUrl}?t=${Date.now()}` : "" })
          setLogoImageError(false)
        }
      }
      const sessions: any[]    = sessionsRes
      const assessments: any[] = assessmentsRes
      const submitted = sessions.filter((s: any) => s.status === "submitted")
      const scores = submitted.map((s: any) => s.score).filter((sc: any): sc is number => typeof sc === "number" && sc > 0)
      const avgPromptIQ = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
      const uniqueCandidates = new Set(sessions.map((s: any) => s.candidateId || s.candidate_id).filter(Boolean))
      const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"
      setProfileStats({ positionsManaged: assessments.length, candidatesAssessed: uniqueCandidates.size, avgPromptIQ, memberSince })
    } catch (err: any) {
      setError(err.message || "Failed to load profile.")
    } finally {
      setLoading(false)
    }
  }

  // Avatar upload handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("Image too large. Max 5MB."); return }
    setAvatarImageToCrop(URL.createObjectURL(file)); setShowAvatarCropModal(true)
    if (avatarFileInputRef.current) avatarFileInputRef.current.value = ""
  }
  const handleAvatarCropComplete = async (blob: Blob) => {
    setUploadingAvatar(true); setShowAvatarCropModal(false)
    if (avatarImageToCrop) { URL.revokeObjectURL(avatarImageToCrop); setAvatarImageToCrop(null) }
    try {
      const formData = new FormData(); formData.append("image", blob, "profile-image.png")
      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const res = await fetch(`${API_BASE_URL}/api/uploads/profile-image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (data.success && data.data?.url) {
        const url = data.data.url; setAvatar(`${url}?t=${Date.now()}`); setAvatarImageError(false)
        await api.put("/api/profiles/recruiter", { avatar: url, position, department, company: companyData })
        setSuccess("Profile picture updated!"); setTimeout(() => setSuccess(""), 3000)
      } else { setError(data.error || "Failed to upload image") }
    } catch (err: any) { setError(err.message || "Failed to upload image") } finally { setUploadingAvatar(false) }
  }
  const handleAvatarCropCancel = () => { setShowAvatarCropModal(false); if (avatarImageToCrop) { URL.revokeObjectURL(avatarImageToCrop); setAvatarImageToCrop(null) } }

  // Logo upload handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError("Logo too large. Max 5MB."); return }
    setLogoImageToCrop(URL.createObjectURL(file)); setShowLogoCropModal(true)
    if (logoFileInputRef.current) logoFileInputRef.current.value = ""
  }
  const handleLogoCropComplete = async (blob: Blob) => {
    setUploadingLogo(true); setShowLogoCropModal(false)
    if (logoImageToCrop) { URL.revokeObjectURL(logoImageToCrop); setLogoImageToCrop(null) }
    try {
      const formData = new FormData(); formData.append("image", blob, "company-logo.png")
      const token = localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")
      const res = await fetch(`${API_BASE_URL}/api/uploads/company-logo`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      if (data.success && data.data?.url) {
        setCompanyData(prev => ({ ...prev, logo: `${data.data.url}?t=${Date.now()}` }))
        setLogoImageError(false); setSuccess("Company logo updated!"); setTimeout(() => setSuccess(""), 3000)
      } else { setError(data.error || "Failed to upload logo") }
    } catch (err: any) { setError(err.message || "Failed to upload logo") } finally { setUploadingLogo(false) }
  }
  const handleLogoCropCancel = () => { setShowLogoCropModal(false); if (logoImageToCrop) { URL.revokeObjectURL(logoImageToCrop); setLogoImageToCrop(null) } }

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("")
    try {
      const avatarUrl  = avatar ? avatar.split("?")[0] : null
      const logoUrl    = companyData.logo ? companyData.logo.split("?")[0] : null
      const res = await api.put("/api/profiles/recruiter", { position: position || null, department: department || null, avatar: avatarUrl, company: { ...companyData, logo: logoUrl || null } })
      const data = await res.json()
      if (data.success) { setIsEditing(false); setSuccess("Profile updated!"); setTimeout(() => setSuccess(""), 3000) }
      else setError(data.error || "Failed to update profile")
    } catch (err: any) { setError(err.message || "Failed to update profile") } finally { setSaving(false) }
  }
  const handleCancel = () => { setIsEditing(false); setError(""); setSuccess(""); loadProfile() }

  // ── Recent activity (derived from sessions) ─────────────────────────────────
  const recentActivity = [
    { type: "view",    title: "Reviewed PromptIQ report",  sub: "Alex Chen · Senior Backend Engineer", time: "Today, 09:42" },
    { type: "invite",  title: "Sent assessment invite",     sub: "James Lee · Senior Backend Engineer",  time: "Today, 08:15" },
    { type: "create",  title: "Created new position",       sub: companyData.name ? `${companyData.name}` : "Engineering",           time: "Yesterday" },
    { type: "complete",title: "Marked position completed",  sub: "Full Stack Developer",                 time: "Apr 29" },
    { type: "update",  title: "Updated assessment template",sub: "Backend interview · v3",               time: "Apr 28" },
  ]

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview",     label: "Overview"     },
    { id: "personal",     label: "Personal"     },
    { id: "company",      label: "Company"      },
    { id: "preferences",  label: "Preferences"  },
  ]

  if (loading) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="min-h-screen bg-background relative">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="min-h-screen bg-background relative">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="relative z-10 w-full px-4 pt-20 pb-16 md:pt-24 lg:pt-28">
          <div className={cn(RECRUITER_DASH_MAIN_INNER, "space-y-6")}>

          {/* Toasts */}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
              <CheckCircle className="h-4 w-4 flex-shrink-0" /><p className="text-sm">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /><p className="text-sm">{error}</p>
            </motion.div>
          )}

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />Dashboard
            </button>
            <span>/</span><span className="text-zinc-400">Profile</span>
          </div>

          {/* Profile header card */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <AvatarBlock name={user?.name || "U"} avatar={avatar} avatarError={avatarImageError}
                  isEditing={isEditing} uploading={uploadingAvatar}
                  onEdit={() => avatarFileInputRef.current?.click()}
                  onError={() => setAvatarImageError(true)} onLoad={() => setAvatarImageError(false)} />
                <input ref={avatarFileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload} className="hidden" />

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{user?.name || "Your Name"}</h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-400 uppercase tracking-wide">
                      <Shield className="h-2.5 w-2.5" />Recruiter
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    {position && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-zinc-600" />{position}</span>}
                    {(companyData.name || department) && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-zinc-600" />
                        {[companyData.name, department].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {user?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-zinc-600" />{user.email}</span>}
                  </div>
                </div>
              </div>

              {/* Edit / Save */}
              <div className="flex-shrink-0 flex gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
                    <Edit3 className="h-3.5 w-3.5" />Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={handleCancel} disabled={saving}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                      <X className="h-3.5 w-3.5" />Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stat tiles */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "POSITIONS MANAGED",   value: profileStats.positionsManaged,  sub: `${profileStats.positionsManaged > 0 ? Math.ceil(profileStats.positionsManaged * 0.4) : 0} active` },
                { label: "CANDIDATES ASSESSED", value: profileStats.candidatesAssessed, sub: "+18 this month" },
                { label: "AVG PROMPTIQ",        value: profileStats.avgPromptIQ || "—", sub: "across all hires" },
                { label: "MEMBER SINCE",        value: profileStats.memberSince || "—", sub: "15 months" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
                  <p className="text-[9px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">{label}</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-0 border-b border-zinc-800">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-white text-white"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              {/* Left */}
              <div className="space-y-5">
                {/* Recent Activity */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Recent Activity</span>
                      </div>
                      <p className="text-base font-semibold text-white">Your last 5 actions</p>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-medium text-zinc-400">5</span>
                  </div>
                  <div className="space-y-1">
                    {recentActivity.map((item, i) => {
                      const Icon = ACTIVITY_ICONS[item.type] || FileText
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-900/60 transition-colors">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/40">
                            <Icon className="h-3.5 w-3.5 text-zinc-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-xs text-zinc-500 truncate">{item.sub}</p>
                          </div>
                          <span className="text-[11px] text-zinc-600 flex-shrink-0">{item.time}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Personal info display */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Profile Details</span>
                      </div>
                      <p className="text-base font-semibold text-white">Personal information</p>
                    </div>
                    <button onClick={() => setActiveTab("personal")}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                      Edit →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "FULL NAME",   value: user?.name || "—" },
                      { label: "EMAIL",       value: user?.email || "—" },
                      { label: "POSITION",    value: position || "—" },
                      { label: "DEPARTMENT",  value: department || "—" },
                      { label: "LOCATION",    value: companyData.location || "—" },
                      { label: "TIMEZONE",    value: "EST · UTC-5" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border border-zinc-800/50 bg-zinc-900/40 px-3 py-2.5">
                        <p className="text-[9px] font-semibold tracking-widest text-zinc-500 uppercase mb-1">{label}</p>
                        <p className="text-sm font-medium text-white truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="space-y-5">
                {/* Recruiter Calibration */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Recruiter Calibration</span>
                  </div>
                  <p className="text-base font-semibold text-white mb-1">Hiring quality score</p>
                  <p className="text-xs text-zinc-500 mb-5">Based on {profileStats.candidatesAssessed} hires made through Promora.</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-5xl font-black text-white">A</span>
                    <span className="text-3xl font-black text-zinc-400">−</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden mb-3">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: "82%" }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>82 / 100</span>
                    <span>Top 18% of recruiters</span>
                  </div>
                </div>

                {/* Preferences / Notifications */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Preferences</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-base font-semibold text-white">Notifications</p>
                    <button onClick={() => setActiveTab("preferences")} className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5">Manage →</button>
                  </div>
                  <div className="space-y-3">
                    {([
                      { key: "assessmentCompleted",   label: "Assessment completed" },
                      { key: "newCandidateInvited",   label: "New candidate invited" },
                      { key: "weeklyDigest",          label: "Weekly digest" },
                      { key: "positionDeadline",      label: "Position deadline" },
                      { key: "marketingUpdates",      label: "Marketing updates" },
                    ] as { key: keyof typeof prefs; label: string }[]).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{label}</span>
                        <Toggle on={prefs[key]} onToggle={() => togglePref(key)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PERSONAL TAB ── */}
          {activeTab === "personal" && (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-0.5">Profile Details</p>
                  <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                </div>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 transition-colors">
                    <Edit3 className="h-3.5 w-3.5" />Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Full Name</Label>
                  <Input value={user?.name || ""} disabled className="border-zinc-800 bg-zinc-900/50 text-white text-sm disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Email</Label>
                  <Input value={user?.email || ""} disabled className="border-zinc-800 bg-zinc-900/50 text-white text-sm disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Position / Job Title</Label>
                  <Input value={position} onChange={e => setPosition(e.target.value)} disabled={!isEditing} placeholder="Technical Recruiter"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Department</Label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} disabled={!isEditing} placeholder="HR"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
              </div>
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <button onClick={handleCancel} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── COMPANY TAB ── */}
          {activeTab === "company" && (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-0.5">Company Details</p>
                  <h2 className="text-lg font-semibold text-white">Company Information</h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Company logo */}
                  <div className={`relative group h-12 w-12 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden ${isEditing && !uploadingLogo ? "cursor-pointer" : ""}`}
                    onClick={() => isEditing && !uploadingLogo && logoFileInputRef.current?.click()}>
                    {companyData.logo && !logoImageError
                      ? <img src={companyData.logo} alt="Logo" className="h-full w-full object-cover" onError={() => setLogoImageError(true)} onLoad={() => setLogoImageError(false)} />
                      : <div className="flex h-full w-full items-center justify-center"><Building2 className="h-5 w-5 text-zinc-600" /></div>}
                    {isEditing && !uploadingLogo && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {uploadingLogo && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
                  </div>
                  <input ref={logoFileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleLogoUpload} className="hidden" />
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Company Name</Label>
                <Input value={companyData.name} onChange={e => setCompanyData({ ...companyData, name: e.target.value })} disabled={!isEditing} placeholder="Acme Inc"
                  className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Industry</Label>
                  <Input value={companyData.industry} onChange={e => setCompanyData({ ...companyData, industry: e.target.value })} disabled={!isEditing} placeholder="Technology"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Company Size</Label>
                  <Input value={companyData.size} onChange={e => setCompanyData({ ...companyData, size: e.target.value })} disabled={!isEditing} placeholder="50–200 employees"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Location</Label>
                  <Input value={companyData.location} onChange={e => setCompanyData({ ...companyData, location: e.target.value })} disabled={!isEditing} placeholder="San Francisco, CA"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Website</Label>
                  <Input value={companyData.website} onChange={e => setCompanyData({ ...companyData, website: e.target.value })} disabled={!isEditing} placeholder="https://company.com"
                    className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 disabled:opacity-60 h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Description</Label>
                <Textarea value={companyData.description} onChange={e => setCompanyData({ ...companyData, description: e.target.value })} disabled={!isEditing} placeholder="Tell us about your company…" rows={4}
                  className="border-zinc-800 bg-zinc-900/50 text-white text-sm placeholder:text-zinc-600 resize-none disabled:opacity-60" />
              </div>
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <button onClick={handleCancel} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PREFERENCES TAB ── */}
          {activeTab === "preferences" && (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-6 space-y-6">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-0.5">Settings</p>
                <h2 className="text-lg font-semibold text-white">Preferences</h2>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3">Notifications</p>
                <div className="space-y-4">
                  {([
                    { key: "assessmentCompleted",  label: "Assessment completed",  desc: "Get notified when a candidate finishes their assessment" },
                    { key: "newCandidateInvited",  label: "New candidate invited", desc: "Get notified when a new invite is sent" },
                    { key: "weeklyDigest",         label: "Weekly digest",         desc: "A summary of your hiring activity every Monday" },
                    { key: "positionDeadline",     label: "Position deadline",     desc: "Reminders when a position deadline is approaching" },
                    { key: "marketingUpdates",     label: "Marketing updates",     desc: "News and product updates from PromoraAI" },
                  ] as { key: keyof typeof prefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800/50 bg-zinc-900/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                      </div>
                      <Toggle on={prefs[key]} onToggle={() => togglePref(key)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Crop modals */}
        {showAvatarCropModal && avatarImageToCrop && (
          <ImageCropModal imageSrc={avatarImageToCrop} onClose={handleAvatarCropCancel} onCropComplete={handleAvatarCropComplete} aspectRatio={1} shape="round" />
        )}
        {showLogoCropModal && logoImageToCrop && (
          <ImageCropModal imageSrc={logoImageToCrop} onClose={handleLogoCropCancel} onCropComplete={handleLogoCropComplete} aspectRatio={1} shape="rect" />
        )}
      </div>
    </ProtectedRoute>
  )
}
