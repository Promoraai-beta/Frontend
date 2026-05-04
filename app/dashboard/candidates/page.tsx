"use client"

import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import { Search, X, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { DashboardEditorialShell } from "@/components/dashboard/editorial/dashboard-editorial-shell"
import { DashboardPageHeader } from "@/components/dashboard/editorial/dashboard-page-header"
import { EditorialAvatarInitials } from "@/components/dashboard/editorial/editorial-avatar"

const PAGE_SIZE = 10

const STATUS_RANK: Record<string, number> = {
  completed: 0,
  "in-progress": 1,
  "not-started": 2,
}

function StatusPill({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
        Completed
      </span>
    )
  if (status === "in-progress")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:border-amber-500/30 dark:text-amber-400">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" />
        In progress
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-muted/50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/70" />
      Invited
    </span>
  )
}

function PromptIQCell({ score }: { score: number }) {
  return (
    <div className="flex w-full max-w-[9rem] items-center justify-end gap-2 lg:max-w-none lg:justify-start">
      <span className="font-serif text-lg tabular-nums tracking-tight text-foreground md:text-xl">{score}</span>
      <div className="hidden min-w-0 flex-1 h-1.5 overflow-hidden rounded-full bg-muted md:block">
        <div className="h-full rounded-full bg-accent/70" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, assRes] = await Promise.all([
          api.get("/api/sessions").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
          api.get("/api/assessments").then((r) => r.json()).then((d) => (d.success ? d.data || [] : [])).catch(() => []),
        ])
        setSessions(sessRes)
        setAssessments(assRes)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const assessmentMap = useMemo(
    () => Object.fromEntries(assessments.map((a) => [a.id, a.jobTitle || a.role || "Untitled"])),
    [assessments]
  )

  const candidates = useMemo(
    () =>
      sessions.map((s) => ({
        id: s.id,
        name: s.candidateName || s.candidate_name || "Unknown",
        email: s.candidateEmail || s.candidate_email || "",
        position: assessmentMap[s.assessmentId] || "—",
        assessmentId: s.assessmentId,
        status: s.status === "pending" ? "not-started" : s.status === "active" ? "in-progress" : "completed",
        score: s.score,
      })),
    [sessions, assessmentMap]
  )

  const filtered = useMemo(
    () =>
      candidates.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.position.toLowerCase().includes(search.toLowerCase())
      ),
    [candidates, search]
  )

  /** Completed first (View available), then in progress, then invited */
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ra = STATUS_RANK[a.status] ?? 99
      const rb = STATUS_RANK[b.status] ?? 99
      if (ra !== rb) return ra - rb
      if (a.status === "completed" && b.status === "completed") {
        return (Number(b.score) || 0) - (Number(a.score) || 0)
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })
  }, [filtered])

  const total = sortedFiltered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIdx = (safePage - 1) * PAGE_SIZE
  const pageRows = sortedFiltered.slice(startIdx, startIdx + PAGE_SIZE)
  const showingFrom = total === 0 ? 0 : startIdx + 1
  const showingTo = startIdx + pageRows.length

  const completed = sortedFiltered.filter((c) => c.status === "completed").length
  const inProgress = sortedFiltered.filter((c) => c.status === "in-progress").length

  /** lg: 12-column proportional grid — avoids empty gap between PromptIQ and Open */
  const rowGrid =
    "grid grid-cols-12 gap-y-3 lg:grid-cols-12 lg:gap-x-5 xl:gap-x-8 lg:gap-y-0 lg:items-center"

  return (
    <ProtectedRoute requiredRole="recruiter">
      <DashboardEditorialShell>
        <DashboardPageHeader
          eyebrow="Talent pool"
          title="All"
          italic="candidates."
          actionsClassName="w-full basis-full sm:w-auto sm:basis-auto sm:justify-end"
          description={
            loading ? (
              "Loading…"
            ) : (
              <>
                {total} total · {completed} completed · {inProgress} in progress
              </>
            )
          }
          actions={
            <div className="relative w-full min-w-0 sm:max-w-xl lg:w-[min(100%,28rem)] lg:shrink-0">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 z-[1] h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                autoComplete="off"
                className="h-11 w-full rounded-full border-0 bg-white py-2.5 pl-11 pr-11 text-sm text-foreground shadow-[0_1px_3px_hsl(240_18%_8%/0.06)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:bg-card dark:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.45),0_8px_24px_-12px_hsl(240_24%_4%/0.35)]"
                aria-label="Search candidates"
              />
              <button
                type="button"
                onClick={() => setSearch("")}
                disabled={!search}
                className={cn(
                  "absolute right-2.5 top-1/2 z-[1] -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors",
                  search ? "hover:bg-foreground/[0.06] hover:text-foreground" : "opacity-30"
                )}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          }
        />

        <div className="w-full overflow-hidden rounded-3xl border border-hairline bg-card shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
          <div
            className={`hidden border-b border-hairline bg-muted/25 px-6 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground lg:grid lg:grid-cols-12 lg:gap-x-5 xl:gap-x-8 lg:px-8 xl:px-10`}
          >
            <div className="col-span-2">Name</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Position</div>
            <div className="col-span-2 whitespace-nowrap">Status</div>
            <div className="col-span-2">PromptIQ</div>
            <div className="col-span-1 text-right">Open</div>
          </div>

          {loading ? (
            <div className="space-y-0 divide-y divide-border px-6 py-8 lg:px-8 xl:px-10">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="py-5">
                  <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="px-8 py-20 text-center lg:px-12 lg:py-24">
              <p className="font-serif text-xl text-foreground">{search ? "No matches" : "No candidates yet"}</p>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                {search
                  ? "Try a different search term."
                  : "Invite candidates from any position to populate this list."}
              </p>
            </div>
          ) : (
            <>
              {pageRows.map((c, i) => (
                <div
                  key={c.id}
                  className={`${rowGrid} px-5 py-5 transition-colors hover:bg-muted/[0.12] md:px-6 lg:px-8 xl:px-10 lg:py-6 ${
                    i < pageRows.length - 1 ? "border-b border-hairline" : ""
                  }`}
                >
                  <div className="col-span-12 flex min-w-0 items-center gap-3 lg:col-span-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      Name
                    </span>
                    <EditorialAvatarInitials name={c.name} size="sm" />
                    <span className="truncate font-serif text-base leading-snug tracking-tight text-foreground">
                      {c.name}
                    </span>
                  </div>
                  <div className="col-span-12 flex min-w-0 gap-3 lg:col-span-3 lg:block lg:gap-0">
                    <span className="w-14 shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      Email
                    </span>
                    <span className="block truncate font-mono text-[12px] leading-snug text-muted-foreground">{c.email}</span>
                  </div>
                  <div className="col-span-12 flex min-w-0 gap-3 truncate lg:col-span-2 lg:block">
                    <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      Role
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{c.position}</span>
                  </div>
                  <div className="col-span-12 flex flex-wrap items-center gap-3 lg:col-span-2 lg:block">
                    <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      Status
                    </span>
                    <StatusPill status={c.status} />
                  </div>
                  <div className="col-span-12 flex items-center justify-between gap-4 lg:col-span-2 lg:flex lg:items-center lg:justify-start lg:text-left">
                    <span className="w-14 shrink-0 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      IQ
                    </span>
                    {c.score !== undefined && c.score > 0 ? (
                      <PromptIQCell score={c.score} />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="col-span-12 flex items-center justify-between gap-4 lg:col-span-1 lg:justify-end">
                    <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                      Open
                    </span>
                    <div className="flex flex-1 justify-end lg:flex-none">
                      {c.status === "completed" ? (
                      <Link
                        href={`/dashboard/results/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/15 hover:text-accent-glow"
                      >
                        View
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : c.status === "in-progress" ? (
                      <Link
                        href={`/dashboard/live/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-hairline bg-muted/30 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-accent/35 hover:bg-muted/50"
                      >
                        Live
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-[32px] items-center justify-end font-mono text-xs text-muted-foreground lg:min-w-[5rem]">
                        —
                      </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {total > 0 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-hairline bg-muted/[0.08] px-5 py-5 md:flex-row md:px-8 xl:px-10">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Showing <span className="text-foreground">{showingFrom}</span>–
                    <span className="text-foreground">{showingTo}</span> of{" "}
                    <span className="text-foreground">{total}</span>
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-35"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </button>
                      <span className="min-w-[7rem] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Page {safePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-card px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-35"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardEditorialShell>
    </ProtectedRoute>
  )
}
