"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Candidate } from "@/lib/mock-data"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"
import { InviteCandidateModal } from "@/components/dashboard/invite-candidate-modal"

interface CandidateListProps {
  candidates: Candidate[]
  jobTitle: string
  onBack?: () => void
  createdAt?: string
  isActive?: boolean
  assessmentId?: string
  onRefresh?: () => void
}

function AvatarInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-xs font-semibold text-white flex-shrink-0">
      {initials.toUpperCase()}
    </div>
  )
}

function PromptIQBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right text-sm font-semibold tabular-nums text-white">{score}</span>
      <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full bg-white" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Candidate["assessmentStatus"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />Completed
        </Badge>
      )
    case "in-progress":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />In Progress
        </Badge>
      )
    case "not-started":
      return (
        <Badge className="bg-zinc-700/60 text-zinc-400 border border-zinc-600/30 text-xs font-medium">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />Invited
        </Badge>
      )
  }
}

export function CandidateList({ candidates, jobTitle, onBack, isActive, assessmentId, onRefresh }: CandidateListProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
    catch { return "—" }
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb + title */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />Positions
          </button>
          <span>/</span>
          <span className="text-zinc-400">{jobTitle}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{jobTitle}</h2>
            <Badge className={`text-xs font-medium ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-700/50 text-zinc-400 border border-zinc-600/20"
            }`}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-zinc-500"}`} />
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="bg-white text-black hover:bg-zinc-200 gap-2 text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            Invite Candidate
          </Button>
        </div>
      </div>

      {/* Candidates table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr] gap-3 border-b border-zinc-800/60 px-5 py-3">
          {["NAME", "EMAIL", "INVITED", "STATUS", "PROMPTIQ", "ACTION"].map((col) => (
            <span key={col} className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">{col}</span>
          ))}
        </div>

        {candidates.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm text-zinc-500 mb-3">No candidates yet.</p>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-white text-black hover:bg-zinc-200 gap-2">
              <UserPlus className="h-4 w-4" />Invite First Candidate
            </Button>
          </div>
        ) : (
          candidates.map((candidate, i) => (
            <div
              key={candidate.id}
              className={`grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr] gap-3 items-center px-5 py-3.5 hover:bg-zinc-900/40 transition-colors ${
                i < candidates.length - 1 ? "border-b border-zinc-800/40" : ""
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AvatarInitials name={candidate.name} />
                <span className="text-sm font-medium text-white truncate">{candidate.name}</span>
              </div>
              <span className="text-sm text-zinc-400 truncate font-mono text-xs">{candidate.email}</span>
              <span className="text-sm text-zinc-500">{formatDate(candidate.attemptedAt)}</span>
              <div><StatusBadge status={candidate.assessmentStatus} /></div>
              <div>
                {candidate.score !== undefined
                  ? <PromptIQBar score={candidate.score} />
                  : <span className="text-sm text-zinc-600">—</span>}
              </div>
              <div>
                {candidate.assessmentStatus === "completed" ? (
                  <Link href={`/dashboard/results/${candidate.sessionId || candidate.id}`}
                    className="text-xs text-zinc-400 hover:text-white transition-colors">View Report</Link>
                ) : candidate.assessmentStatus === "in-progress" ? (
                  <Link href={`/dashboard/live/${candidate.sessionId || candidate.id}`}
                    className="text-xs text-zinc-400 hover:text-white transition-colors">View Live</Link>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <InviteCandidateModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        defaultAssessmentId={assessmentId}
        onSuccess={() => { setInviteOpen(false); onRefresh?.() }}
      />
    </div>
  )
}
