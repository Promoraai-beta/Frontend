"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnimatedBackground } from "@/components/animated-background"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/components/auth-provider"
import { api } from "@/lib/api"
import {
  ArrowLeft, Upload, CheckCircle, Sparkles,
  X, FileText, AlertCircle, Clock, Calendar, Zap,
  ChevronRight, Mail, Download, Plus
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ParsedCandidate {
  id: string
  name: string
  email: string
  valid: boolean
  error?: string
}

type ScheduleType = "immediate" | "staggered" | "scheduled"
type DeadlineDays = 3 | 7 | 14 | "custom"

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCSV(text: string): ParsedCandidate[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes("name") || firstLine.includes("email")
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.filter(l => l.trim()).map((line, i) => {
    const cols = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""))
    const id = `csv-${i}`
    const emailCol = cols.find(c => c.includes("@"))
    if (!emailCol) return { id, name: cols[0] || "", email: "", valid: false, error: "No email found" }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCol)
    const nameCol = cols.find(c => !c.includes("@") && c.length > 0) || emailCol.split("@")[0]
    return { id, name: nameCol, email: emailCol, valid: emailValid, error: emailValid ? undefined : "Invalid email" }
  })
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const avatarColors = [
  "from-violet-600 to-indigo-700",
  "from-sky-600 to-blue-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
  "from-fuchsia-600 to-purple-700",
]

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  const steps = ["Upload", "Review", "Send"]
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-0">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
              i < current ? "bg-emerald-500 text-white" : i === current ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500"
            }`}>
              {i < current ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === current ? "text-white" : i < current ? "text-emerald-400" : "text-zinc-600"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-3 h-px w-8 ${i < current ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Variant Slider Card ───────────────────────────────────────────────────────
// sliderVal: 0 = no variants, 1-4 = exact N, 5 = one-per-candidate
function VariantSliderCard({
  candidateCount,
  sliderVal,
  onSliderChange,
}: {
  candidateCount: number
  sliderVal: number   // 0-5
  onSliderChange: (v: number) => void
}) {
  const effectiveVariants = sliderVal === 0 ? 1 : sliderVal === 5 ? candidateCount : sliderVal
  const label = sliderVal === 0
    ? "Shared template — all candidates get the same codebase"
    : sliderVal === 5
    ? `${candidateCount} unique variants will be generated`
    : `${sliderVal} unique variants will be generated`

  const sublabel = sliderVal === 0
    ? "Turn up the slider to enable anti-cheating variant pool."
    : "Each candidate receives structurally different questions — sharing answers won't help."

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
      <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-violet-400" />
        Variant Assignment
      </span>

      <div>
        <h3 className="text-base font-semibold text-white">{label}</h3>
        <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={sliderVal}
          onChange={e => onSliderChange(Number(e.target.value))}
          className="w-full accent-violet-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>0</span>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5+</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
        <span className="text-xs text-zinc-500">{candidateCount} invites in this batch</span>
        <span className="text-xs text-zinc-400 font-medium">
          {sliderVal === 0 ? "1 shared" : sliderVal === 5 ? `${candidateCount} unique` : `${sliderVal} unique`} variant{effectiveVariants !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}

// ── Email Preview Card ────────────────────────────────────────────────────────
function EmailPreviewCard({
  positionTitle,
  recruiterName,
  companyName,
}: {
  positionTitle: string
  recruiterName: string
  companyName: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
      <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        Email Preview
      </span>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 w-16 shrink-0">FROM</span>
          <span className="text-zinc-400 font-mono">{companyName.toLowerCase().replace(/\s/g, "")}@acme.com</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 w-16 shrink-0">SUBJECT</span>
          <span className="text-zinc-300">You're invited to a {positionTitle} assessment</span>
        </div>
        <div className="border-t border-zinc-800/60 pt-2.5 space-y-2">
          <p className="text-zinc-400">Hi [Candidate],</p>
          <p className="text-zinc-500 leading-relaxed">
            {recruiterName} at {companyName} has invited you to take a short technical assessment for the {positionTitle} role…
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BulkInvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const assessmentId = params.id as string

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Send config
  const [scheduleType, setScheduleType] = useState<ScheduleType>("immediate")
  const [staggerRate, setStaggerRate] = useState(5)
  const [scheduledAt, setScheduledAt] = useState("")
  const [deadlineDays, setDeadlineDays] = useState<DeadlineDays>(7)
  const [customDeadline, setCustomDeadline] = useState("")
  const [variantSlider, setVariantSlider] = useState(5) // default = all unique

  // Sending state
  const [isSending, setIsSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [sendingProgress, setSendingProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [finalSentCount, setFinalSentCount] = useState(0)

  // Position info
  const [positionTitle, setPositionTitle] = useState("the position")
  const [companyName, setCompanyName] = useState("Acme")
  const recruiterName = user?.name || "Recruiter"

  useEffect(() => {
    api.get(`/api/assessments/${assessmentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setPositionTitle(d.data.jobTitle || d.data.role || "the position")
          setCompanyName(d.data.company?.name || "Acme")
        }
      })
      .catch(() => {})
  }, [assessmentId])

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please upload a .csv file"); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setParseError("File too large (max 5 MB)"); return
    }
    setFileName(file.name)
    setParseError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) { setParseError("No valid rows found in CSV"); return }
      if (parsed.length > 500) { setParseError("CSV has more than 500 rows. Split into batches."); return }
      setCandidates(parsed)
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const downloadTemplate = () => {
    const csv = "name,email\nAlex Chen,alex@acme.com\nSarah Kim,sarah@acme.com"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "candidates-template.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const removeCandidate = (id: string) => setCandidates(prev => prev.filter(c => c.id !== id))

  const validCandidates = candidates.filter(c => c.valid)
  const invalidCandidates = candidates.filter(c => !c.valid)

  // Compute how many variants to request based on slider
  const effectiveVariantCount = variantSlider === 0 ? 0 : variantSlider === 5 ? validCandidates.length : variantSlider

  const handleSend = async () => {
    if (!validCandidates.length) return
    setIsSending(true)
    setSentCount(0)
    setSendingProgress(0)

    // ── Step 1: Generate variants via Server B (if requested) ─────────────────
    if (effectiveVariantCount > 0) {
      try {
        await api.post(`/api/assessments/${assessmentId}/generate-variants`, {
          variantCount: effectiveVariantCount,
        })
      } catch {
        // Non-fatal: fall back to single template if variant generation fails
      }
    }

    // ── Step 2: Create a session for each valid candidate ─────────────────────
    let sent = 0
    const total = validCandidates.length
    const deadlineDate = new Date()
    const daysToAdd = deadlineDays === "custom"
      ? (customDeadline ? Math.ceil((new Date(customDeadline).getTime() - Date.now()) / 86400000) : 7)
      : deadlineDays
    deadlineDate.setDate(deadlineDate.getDate() + daysToAdd)

    for (const candidate of validCandidates) {
      try {
        await api.post("/api/sessions", {
          candidate_name: candidate.name || candidate.email.split("@")[0],
          candidate_email: candidate.email,
          time_limit: 3600,
          expires_at: deadlineDate.toISOString(),
          assessment_id: assessmentId,
          status: "pending",
        })
        sent++
      } catch { /* continue */ }

      setSentCount(sent)
      setSendingProgress(Math.round(((sent) / total) * 100))
      await new Promise(r => setTimeout(r, 80))
    }

    setFinalSentCount(sent)
    setIsSending(false)
    setIsDone(true)
  }

  const scheduleLabel =
    scheduleType === "immediate" ? "Immediate" :
    scheduleType === "staggered" ? `${staggerRate}/day` :
    scheduledAt ? new Date(scheduledAt).toLocaleString() : "Scheduled"

  const deadlineLabel = deadlineDays === "custom"
    ? (customDeadline ? new Date(customDeadline).toLocaleDateString() : "Custom")
    : `${deadlineDays} day`

  // ── Dispatching screen ───────────────────────────────────────────────────────
  if (isSending) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="relative min-h-screen bg-background">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="container mx-auto px-4 pt-24 pb-12 md:px-6 lg:px-8 max-w-5xl">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{positionTitle} / Bulk Invite</p>
                  <h1 className="text-2xl font-bold text-white">Bulk Invite Candidates</h1>
                  <p className="mt-1 text-sm text-zinc-500">Upload a CSV to invite up to 500 candidates at once.</p>
                </div>
                <StepIndicator current={2} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 flex flex-col items-center justify-center py-20 px-8 text-center gap-6"
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-violet-600">
                <Sparkles className="h-9 w-9 text-white" />
                <motion.div
                  className="absolute inset-0 rounded-full border border-violet-400/40"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Dispatching invites...</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Generating unique assessment links for {validCandidates.length} candidates.
                </p>
              </div>
              <div className="w-64 space-y-2">
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-violet-500"
                    animate={{ width: `${sendingProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-zinc-600 tabular-nums">{sentCount} / {validCandidates.length} sent</p>
              </div>
            </motion.div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="relative min-h-screen bg-background">
          <AnimatedBackground />
          <RecruiterNavbar />
          <div className="container mx-auto px-4 pt-24 pb-12 md:px-6 lg:px-8 max-w-5xl">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{positionTitle} / Bulk Invite</p>
                  <h1 className="text-2xl font-bold text-white">Bulk Invite Candidates</h1>
                  <p className="mt-1 text-sm text-zinc-500">Upload a CSV to invite up to 500 candidates at once.</p>
                </div>
                <StepIndicator current={2} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 flex flex-col items-center justify-center py-20 px-8 text-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500"
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold text-white">{finalSentCount} invites sent</h2>
                <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                  {effectiveVariantCount > 0
                    ? `${effectiveVariantCount} unique assessment variants generated. `
                    : ""}
                  Candidates will receive their email within 60 seconds.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setCandidates([]); setFileName(null); setStep(0)
                    setIsDone(false); setSentCount(0); setFinalSentCount(0)
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                >
                  Send another batch
                </button>
                <button
                  onClick={() => router.push(`/dashboard/positions`)}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  View Position <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // ── Main layout ──────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-background">
        <AnimatedBackground />
        <RecruiterNavbar />

        <div className="container mx-auto px-4 pt-20 pb-32 md:px-6 md:pt-24 lg:px-8 lg:pt-28 max-w-5xl">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
              <button
                onClick={() => step === 0 ? router.back() : setStep((step - 1) as 0 | 1 | 2)}
                className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {positionTitle}
              </button>
              <span>/</span>
              <span className="text-zinc-400">Bulk Invite</span>
            </div>

            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Bulk Invite Candidates</h1>
                <p className="mt-1 text-sm text-zinc-500">Upload a CSV to invite up to 500 candidates at once.</p>
              </div>
              <div className="shrink-0 mt-1">
                <StepIndicator current={step} />
              </div>
            </div>
          </motion.div>

          {/* ── Step 0: Upload ── */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all py-16 gap-5 ${
                    dragOver ? "border-violet-500/60 bg-violet-500/5"
                    : fileName ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-zinc-700/50 bg-zinc-900/20 hover:border-zinc-600 hover:bg-zinc-900/40"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileInput} />

                  {fileName ? (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <FileText className="h-8 w-8 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">{fileName}</p>
                        <p className="text-xs text-emerald-400 mt-1">
                          {candidates.length} rows parsed · {validCandidates.length} valid
                          {invalidCandidates.length > 0 && ` · ${invalidCandidates.length} errors`}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">Click to replace</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 border border-violet-500/30">
                        <Upload className="h-8 w-8 text-violet-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-300">{dragOver ? "Drop your CSV here" : "Drop your CSV here"}</p>
                        <p className="text-xs text-zinc-500 mt-1">or click to browse · max 500 candidates · 5 MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                        className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" /> Choose File
                      </button>
                    </>
                  )}
                </div>

                {parseError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{parseError}</p>
                  </div>
                )}

                {/* CSV format hint */}
                <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">CSV Format</span>
                    </div>
                    <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                      <Download className="h-3 w-3" /> Download template
                    </button>
                  </div>
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-zinc-800/40">
                        <th className="px-5 py-2.5 text-left text-zinc-500 font-medium tracking-wider">NAME</th>
                        <th className="px-5 py-2.5 text-left text-zinc-500 font-medium tracking-wider">EMAIL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[["Alex Chen", "alex@acme.com"], ["Sarah Kim", "sarah@acme.com"], ["…", "…"]].map(([n, e], i) => (
                        <tr key={i} className={i < 2 ? "border-b border-zinc-800/30" : ""}>
                          <td className="px-5 py-2.5 text-zinc-300">{n}</td>
                          <td className="px-5 py-2.5 text-zinc-400">{e}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Review ── */}
            {step === 1 && (
              <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "PARSED", value: candidates.length },
                    { label: "VALID", value: validCandidates.length, color: "text-emerald-400" },
                    { label: "ISSUES", value: invalidCandidates.length, color: invalidCandidates.length > 0 ? "text-amber-400" : undefined },
                    { label: "SOURCE", value: fileName?.replace(".csv", "") || "—", mono: true },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-widest text-zinc-600 uppercase mb-1">{label}</p>
                      <p className={`text-2xl font-bold ${color || "text-white"} ${mono ? "text-sm font-mono mt-1 truncate" : ""}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Candidate table */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Candidate List</span>
                      <span className="text-xs font-medium text-zinc-600">{candidates.length}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newId = `manual-${Date.now()}`
                        setCandidates(prev => [...prev, { id: newId, name: "", email: "", valid: false, error: "Fill in email" }])
                      }}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add row
                    </button>
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-[2.5rem_2fr_3fr_auto_auto] gap-3 border-b border-zinc-800/50 px-5 py-2.5">
                    {["#", "NAME", "EMAIL", "STATUS", ""].map((col, i) => (
                      <span key={i} className="text-[10px] font-semibold tracking-widest text-zinc-600 uppercase">{col}</span>
                    ))}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {candidates.map((c, i) => {
                      const color = avatarColors[i % avatarColors.length]
                      return (
                        <div
                          key={c.id}
                          className={`grid grid-cols-[2.5rem_2fr_3fr_auto_auto] gap-3 items-center px-5 py-3 ${
                            i < candidates.length - 1 ? "border-b border-zinc-800/30" : ""
                          }`}
                        >
                          <span className="text-xs text-zinc-600 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-[10px] font-bold text-white`}>
                              {c.name ? getInitials(c.name) : "?"}
                            </div>
                            <span className="text-sm text-white truncate">{c.name || "—"}</span>
                          </div>
                          <span className={`text-xs font-mono truncate ${c.valid ? "text-zinc-400" : "text-red-400"}`}>
                            {c.email || "—"}
                          </span>
                          <div>
                            {c.valid ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 whitespace-nowrap">
                                <span className="h-1 w-1 rounded-full bg-emerald-400 inline-block" />Valid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400 whitespace-nowrap">
                                <span className="h-1 w-1 rounded-full bg-red-400 inline-block" />{c.error || "Invalid"}
                              </span>
                            )}
                          </div>
                          <button onClick={() => removeCandidate(c.id)} className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs">
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Send ── */}
            {step === 2 && (
              <motion.div key="send" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid gap-5 lg:grid-cols-2">

                {/* Left: Schedule */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-1">
                  <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5 mb-3">
                    <Clock className="h-3 w-3" />Send Schedule
                  </span>
                  <p className="text-base font-semibold text-white mb-4">When should invites go out?</p>

                  {/* Immediate */}
                  {[
                    { type: "immediate" as ScheduleType, icon: <Zap className="h-4 w-4 text-amber-400" />, title: "Send immediately", desc: `All ${validCandidates.length} invites dispatch within 60 seconds.` },
                    { type: "staggered" as ScheduleType, icon: <Clock className="h-4 w-4 text-blue-400" />, title: "Staggered", desc: "Throttle to avoid spam filters and pace assessment volume." },
                    { type: "scheduled" as ScheduleType, icon: <Calendar className="h-4 w-4 text-violet-400" />, title: "Schedule for later", desc: "Pick a date and time for the batch to send." },
                  ].map(({ type, icon, title, desc }) => (
                    <div
                      key={type}
                      onClick={() => setScheduleType(type)}
                      className={`rounded-xl border p-4 cursor-pointer transition-all space-y-1 ${
                        scheduleType === type
                          ? "border-violet-500/40 bg-violet-500/5"
                          : "border-zinc-800/60 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          scheduleType === type ? "border-violet-400 bg-violet-400" : "border-zinc-600"
                        }`}>
                          {scheduleType === type && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {icon}
                            <span className="text-sm font-medium text-white">{title}</span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>

                          {/* Staggered extra */}
                          {type === "staggered" && scheduleType === "staggered" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Send</span>
                              <button onClick={e => { e.stopPropagation(); setStaggerRate(r => Math.max(1, r - 1)) }} className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-white text-xs">−</button>
                              <span className="text-sm font-medium text-white tabular-nums w-12 text-center">{staggerRate}/day</span>
                              <button onClick={e => { e.stopPropagation(); setStaggerRate(r => Math.min(100, r + 1)) }} className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-white text-xs">+</button>
                              <span className="text-xs text-zinc-500">· ends ~{Math.ceil(validCandidates.length / staggerRate)} days</span>
                            </motion.div>
                          )}

                          {/* Scheduled extra */}
                          {type === "scheduled" && scheduleType === "scheduled" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3" onClick={e => e.stopPropagation()}>
                              <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: Deadline + Variant + Email Preview */}
                <div className="space-y-4">
                  {/* Deadline */}
                  <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
                    <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />Deadline
                    </span>
                    <p className="text-base font-semibold text-white">Time to complete</p>
                    <div className="flex gap-2 flex-wrap">
                      {([3, 7, 14, "custom"] as DeadlineDays[]).map(d => (
                        <button
                          key={String(d)}
                          onClick={() => setDeadlineDays(d)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            deadlineDays === d ? "bg-white text-black" : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                          }`}
                        >
                          {d === "custom" ? "Custom" : `${d} days`}
                        </button>
                      ))}
                    </div>
                    {deadlineDays === "custom" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <input type="date" value={customDeadline} onChange={e => setCustomDeadline(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
                        />
                      </motion.div>
                    )}
                    <p className="text-xs text-zinc-600">Candidates who don't start within the window are auto-marked Expired.</p>
                  </div>

                  {/* Variant slider */}
                  <VariantSliderCard
                    candidateCount={validCandidates.length}
                    sliderVal={variantSlider}
                    onSliderChange={setVariantSlider}
                  />

                  {/* Email preview */}
                  <EmailPreviewCard
                    positionTitle={positionTitle}
                    recruiterName={recruiterName}
                    companyName={companyName}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fixed bottom bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
          <div className="container mx-auto max-w-5xl px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-4">
              <div className="text-xs text-zinc-500 min-w-0 flex items-center gap-2">
                {step === 2 && validCandidates.length > 0 && (
                  <>
                    <span className="font-semibold text-zinc-300">Ready to send {validCandidates.length} invites</span>
                    <span className="text-zinc-700">·</span>
                    <span>{scheduleLabel}</span>
                    <span className="text-zinc-700">·</span>
                    <span>{deadlineLabel} deadline</span>
                  </>
                )}
                {step === 1 && (
                  <span>{validCandidates.length} candidates ready · {invalidCandidates.length} skipped · {fileName}</span>
                )}
                {step === 0 && <span>Upload a CSV to get started</span>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {step > 0 && (
                  <button
                    onClick={() => setStep((step - 1) as 0 | 1 | 2)}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}

                {step < 2 ? (
                  <button
                    disabled={(step === 0 || step === 1) && validCandidates.length === 0}
                    onClick={() => {
                      if (step === 0 && candidates.length > 0) setStep(1)
                      else if (step === 1 && validCandidates.length > 0) setStep(2)
                    }}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {step === 0 ? "Review candidates" : "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    disabled={validCandidates.length === 0}
                    onClick={handleSend}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send {validCandidates.length} Invites
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
