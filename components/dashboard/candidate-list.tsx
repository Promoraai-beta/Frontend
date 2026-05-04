"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Candidate } from "@/lib/mock-data"
import Link from "next/link"
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
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
      {initials.toUpperCase()}
    </div>
  )
}

function PromptIQBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{score}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Candidate["assessmentStatus"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="border border-emerald-500/25 bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Completed
        </Badge>
      )
    case "in-progress":
      return (
        <Badge className="border border-amber-500/25 bg-amber-500/10 text-xs font-medium text-amber-800 dark:text-amber-400">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          In progress
        </Badge>
      )
    case "not-started":
      return (
        <Badge className="border border-border bg-muted/80 text-xs font-medium text-muted-foreground">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          Invited
        </Badge>
      )
  }
}

export function CandidateList({ candidates, jobTitle, onBack, isActive, assessmentId, onRefresh }: CandidateListProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
      return "—"
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Positions
          </button>
          <span className="text-border">/</span>
          <span className="text-foreground/90">{jobTitle}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-2xl text-foreground md:text-3xl">{jobTitle}</h2>
            <Badge
              className={`border px-2 py-0.5 text-[10px] font-medium ${
                isActive
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-border bg-muted/80 text-muted-foreground"
              }`}
            >
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/50"}`}
              />
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="gap-2 rounded-full bg-accent px-5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground hover:bg-accent-deep"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite candidate
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
        <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr] gap-3 border-b border-border px-5 py-3">
          {["Name", "Email", "Invited", "Status", "PromptIQ", "Action"].map((col) => (
            <span key={col} className="eyebrow text-[10px] tracking-[0.14em] text-muted-foreground">
              {col}
            </span>
          ))}
        </div>

        {candidates.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="mb-4 text-sm text-muted-foreground">No candidates yet.</p>
            <Button
              size="sm"
              onClick={() => setInviteOpen(true)}
              className="gap-2 rounded-full bg-accent font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground hover:bg-accent-deep"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite first candidate
            </Button>
          </div>
        ) : (
          candidates.map((candidate, i) => (
            <div
              key={candidate.id}
              className={`grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 ${
                i < candidates.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarInitials name={candidate.name} />
                <span className="truncate text-sm font-medium text-foreground">{candidate.name}</span>
              </div>
              <span className="truncate font-mono text-xs text-muted-foreground">{candidate.email}</span>
              <span className="text-sm text-muted-foreground">{formatDate(candidate.attemptedAt)}</span>
              <div>
                <StatusBadge status={candidate.assessmentStatus} />
              </div>
              <div>
                {candidate.score !== undefined ? (
                  <PromptIQBar score={candidate.score} />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div>
                {candidate.assessmentStatus === "completed" ? (
                  <Link
                    href={`/dashboard/results/${candidate.sessionId || candidate.id}`}
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-deep"
                  >
                    View report
                  </Link>
                ) : candidate.assessmentStatus === "in-progress" ? (
                  <Link
                    href={`/dashboard/live/${candidate.sessionId || candidate.id}`}
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-deep"
                  >
                    View live
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
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
        onSuccess={() => {
          setInviteOpen(false)
          onRefresh?.()
        }}
      />
    </div>
  )
}
