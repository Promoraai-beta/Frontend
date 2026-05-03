"use client"

import { useState, useEffect } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { waitForSessionEnvironmentReady } from "@/lib/provisionSessionEnvironment"
import { CheckCircle, Copy, ExternalLink, Loader2, Mail, Upload, X, Sparkles } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { motion, AnimatePresence } from "framer-motion"

interface InviteCandidateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate?: {
    id?: string
    name: string
    email: string
  }
  defaultAssessmentId?: string
  onSuccess?: () => void
}


export function InviteCandidateModal({
  open,
  onOpenChange,
  candidate,
  defaultAssessmentId,
  onSuccess,
}: InviteCandidateModalProps) {
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<"form" | "provisioning" | "success">("form")
  const [name, setName] = useState(candidate?.name || "")
  const [email, setEmail] = useState(candidate?.email || "")
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(defaultAssessmentId || "")
  const [timeLimit, setTimeLimit] = useState(60)
  // Only needed when no defaultAssessmentId (picker mode)
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const [invitedSession, setInvitedSession] = useState<any>(null)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [provisionContext, setProvisionContext] = useState<{ sessionId: string; assessmentId: string; payload: any } | null>(null)
  const [variantMeta, setVariantMeta] = useState<{ variantIndex: number; scenarioName: string; fileCount: number; issueCount: number } | null>(null)

  useEffect(() => {
    if (open) {
      setName(candidate?.name || "")
      setEmail(candidate?.email || "")
      setSelectedAssessmentId(defaultAssessmentId || "")
      // Only load the dropdown if no position is pre-selected
      if (!defaultAssessmentId) loadAssessments()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setStep("form")
      setName("")
      setEmail("")
      setTimeLimit(60)
      setError("")
      setInvitedSession(null)
      setProvisionError(null)
      setProvisionContext(null)
      setVariantMeta(null)
    }
  }, [open])

  const loadAssessments = async () => {
    try {
      setLoadingAssessments(true)
      const res = await api.get("/api/assessments")
      const data = await res.json()
      if (data.success) {
        setAvailableAssessments(
          (data.data || []).filter((a: any) => a.assessmentType === "recruiter")
        )
      }
    } catch { /* silent */ }
    finally { setLoadingAssessments(false) }
  }

  // ── Single invite ──────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!selectedAssessmentId) { setError("Please select an assessment"); return }
    if (!email) { setError("Email is required"); return }
    setInviting(true)
    setError("")
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      const res = await api.post("/api/sessions", {
        candidate_name: name || email.split("@")[0],
        candidate_email: email,
        time_limit: timeLimit * 60,
        expires_at: expiresAt.toISOString(),
        assessment_id: selectedAssessmentId,
        status: "pending",
      })
      const data = await res.json()
      if (data.success) {
        const assessment = availableAssessments.find((a: any) => a.id === selectedAssessmentId)
        const assessmentUrl =
          data.data.assessmentUrl ||
          `${typeof window !== "undefined" ? window.location.origin : ""}/assessment/${data.data.sessionCode}`
        const payload = {
          ...data.data,
          emailDelivered: data.data.emailDelivered === true,
          assessmentUrl,
          assessmentName: assessment?.jobTitle || assessment?.role || "Assessment",
        }
        flushSync(() => {
          setVariantMeta(data.data.variantMeta ?? null)
          setProvisionContext({ sessionId: data.data.id, assessmentId: selectedAssessmentId, payload })
          setStep("provisioning")
        })
        setInviting(false)
        try {
          await waitForSessionEnvironmentReady({ sessionId: data.data.id, assessmentId: selectedAssessmentId })
          setInvitedSession(payload)
          setStep("success")
          setProvisionContext(null)
          onSuccess?.()
        } catch (e: unknown) {
          setProvisionError(e instanceof Error ? e.message : "Environment failed to start")
        }
        return
      } else {
        setError(data.error || "Failed to create invitation")
      }
    } catch (e: any) {
      setError(e.message || "Failed to invite candidate")
    } finally {
      setInviting(false)
    }
  }

  // ── Provisioning screen ────────────────────────────────────────────────────
  if (step === "provisioning") {
    const agentsDone = !!variantMeta
    const inviteDone = agentsDone
    const envFailed  = !!provisionError

    const steps = [
      {
        label: "Agents launched in parallel",
        sub: agentsDone ? `Variant ${(variantMeta?.variantIndex ?? 0) + 1} ready` : "Running…",
        done: agentsDone,
        spinning: !agentsDone,
      },
      {
        label: "Invite sent",
        sub: null,
        done: inviteDone,
        spinning: false,
      },
      {
        label: "Creating environment",
        sub: null,
        done: false,
        spinning: !envFailed,
        error: envFailed,
      },
    ]

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0d0d1a] border border-zinc-800/60 text-white max-w-sm p-0 overflow-hidden rounded-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">Preparing Assessment</DialogTitle>
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 flex items-center justify-center">
                    {s.error ? (
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                    ) : s.done ? (
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    ) : s.spinning ? (
                      <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm ${s.done || s.spinning ? "text-white" : "text-zinc-600"}`}>{s.label}</p>
                    {s.sub && <p className="text-[11px] text-zinc-500">{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {provisionError && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => {
                  if (!provisionContext) return
                  setProvisionError(null)
                  waitForSessionEnvironmentReady({ sessionId: provisionContext.sessionId, assessmentId: provisionContext.assessmentId })
                    .then(() => { setInvitedSession(provisionContext.payload); setStep("success"); setProvisionContext(null); onSuccess?.() })
                    .catch((e: unknown) => setProvisionError(e instanceof Error ? e.message : "Failed"))
                }} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-0 rounded-xl">Retry</Button>
                <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-zinc-700 text-zinc-300 rounded-xl">Close</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (step === "success" && invitedSession) {
    const url = invitedSession.assessmentUrl as string
    const code = invitedSession.sessionCode as string
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0d0d1a] border border-zinc-800/60 text-white max-w-md p-0 overflow-hidden rounded-2xl">
          <div className="p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Invite sent!</p>
                <p className="text-zinc-500 text-xs">{invitedSession.assessmentName}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Assessment link</p>
                <code className="block text-xs text-emerald-300 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 break-all">{url}</code>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-white" onClick={() => navigator.clipboard.writeText(url)}>
                  <Copy className="h-3.5 w-3.5" /> Copy link
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-white" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                </Button>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Session code</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-white bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">{code}</code>
                  <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => navigator.clipboard.writeText(code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {invitedSession.emailDelivered
              ? <p className="text-zinc-600 text-xs">An email was sent to {email} with this link.</p>
              : <p className="text-amber-500/80 text-xs">Email not configured — share the link manually.</p>
            }
            <Button onClick={() => { onOpenChange(false); onSuccess?.() }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-0">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d0d1a] border border-zinc-800/60 text-white max-w-md p-0 overflow-hidden rounded-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Invite a Candidate</DialogTitle>
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">Invite a Candidate</h2>
              <p className="text-zinc-500 text-xs mt-0.5">They'll get an email with a unique assessment link.</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-7 py-5 space-y-4">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jordan Rivera"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-700/60 bg-zinc-900/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Email Address</label>
              <input
                type="email"
                placeholder="jordan@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-700/60 bg-zinc-900/40 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[11px] text-zinc-600 font-medium">OR</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Bulk invite — navigate to full-page flow */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                if (selectedAssessmentId) {
                  router.push(`/dashboard/positions/${selectedAssessmentId}/bulk-invite`)
                }
              }}
              disabled={!selectedAssessmentId}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-zinc-700/70 bg-zinc-900/30 px-4 py-3.5 text-sm font-medium text-zinc-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload CSV for Bulk Invite
              <span className="ml-auto text-[10px] text-zinc-600">up to 500</span>
            </button>
          </div>

          {/* Position dropdown — only shown when NOT opened from a specific position */}
          {!defaultAssessmentId && (
            loadingAssessments ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading positions…
              </div>
            ) : availableAssessments.length > 0 ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Position</label>
                <select
                  value={selectedAssessmentId}
                  onChange={e => setSelectedAssessmentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700/60 bg-zinc-900/40 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                >
                  <option value="">— Select a position —</option>
                  {availableAssessments.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.jobTitle || a.role || "Untitled"}{a.level ? ` (${a.level})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] mr-auto">
              <Sparkles className="h-3 w-3 text-violet-500/60" />
              A unique variant is generated when you send.
            </div>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 bg-transparent rounded-xl px-5 h-9 text-sm"
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !email || !selectedAssessmentId}
              className="bg-violet-600 hover:bg-violet-700 text-white border-0 rounded-xl px-5 h-9 text-sm gap-2 disabled:opacity-40"
            >
              {inviting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</>
              ) : (
                <><Mail className="h-3.5 w-3.5" />Send Invite</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
