"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import {
  ArrowLeft, RefreshCw, CheckCircle2, Clock,
  Sparkles, Settings2, ChevronRight, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Brand icons ──────────────────────────────────────────────────────────────
function VsCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.881V4.118a1.5 1.5 0 0 0-.85-1.531zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
    </svg>
  )
}
function BracketsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/>
      <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>
    </svg>
  )
}
function PostgresIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <ellipse cx="12" cy="7" rx="8" ry="4"/>
      <path d="M4 7v10c0 2.2 3.6 4 8 4s8-1.8 8-4V7"/>
      <path d="M4 12c0 2.2 3.6 4 8 4s8-1.8 8-4"/>
    </svg>
  )
}
function WordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 8l2 8 3-6 3 6 2-8"/>
    </svg>
  )
}
function ExcelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
      <path d="M13 12l2 3M15 12l-2 3" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Component metadata ────────────────────────────────────────────────────────
const COMPONENT_META: Record<string, {
  Icon: React.FC<{ className?: string }>
  label: string
  tag: string
  tagColor: string
  iconBg: string
  defaultTime: number
}> = {
  ide_project: {
    Icon: VsCodeIcon,
    label: "Code Editor",
    tag: "BUILD A FEATURE",
    tagColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    iconBg: "bg-violet-600",
    defaultTime: 25,
  },
  leetcode: {
    Icon: BracketsIcon,
    label: "Coding Problems",
    tag: "ALGORITHMIC",
    tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    iconBg: "bg-amber-600",
    defaultTime: 20,
  },
  database: {
    Icon: PostgresIcon,
    label: "Database Challenge",
    tag: "QUERY OPTIMIZATION",
    tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    iconBg: "bg-emerald-700",
    defaultTime: 15,
  },
  docs: {
    Icon: WordIcon,
    label: "Written Explanation",
    tag: "DESIGN DOC",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    iconBg: "bg-blue-700",
    defaultTime: 20,
  },
  sheets: {
    Icon: ExcelIcon,
    label: "Spreadsheet Challenge",
    tag: "DATA ANALYSIS",
    tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    iconBg: "bg-rose-700",
    defaultTime: 20,
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve component key from a task object — fall back to first word of id */
function resolveComponent(task: any): string {
  const comp = task.component || task.type || ""
  if (COMPONENT_META[comp]) return comp
  // Fallback: infer from task id
  const id = (task.id || "").toLowerCase()
  for (const key of Object.keys(COMPONENT_META)) {
    if (id.includes(key.replace("_", ""))) return key
  }
  return "ide_project"
}

/** Parse duration string "25 min" → 25, or return default */
function parseDuration(dur: string | number | undefined, fallback: number): number {
  if (typeof dur === "number") return dur
  if (!dur) return fallback
  const n = parseInt(String(dur))
  return isNaN(n) ? fallback : n
}

// ── Task card ────────────────────────────────────────────────────────────────
function TaskCard({
  task, taskIndex, totalTasks, isRegenerating,
}: {
  task: any
  taskIndex: number
  totalTasks: number
  isRegenerating: boolean
}) {
  const componentKey = resolveComponent(task)
  const comp = COMPONENT_META[componentKey]
  if (!comp) return null
  const { Icon, label, tag, tagColor, iconBg, defaultTime } = comp
  const durationMin = parseDuration(task.duration, defaultTime)

  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tagColor}`}>{tag}</span>
            {task.difficulty && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                task.difficulty === "hard"   ? "bg-red-500/15 border-red-500/30 text-red-300" :
                task.difficulty === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" :
                                               "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              }`}>{task.difficulty.toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>{durationMin} min</span>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">Task {taskIndex + 1}</p>
        {isRegenerating ? (
          <div className="flex items-center gap-2 text-zinc-500 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-sm">Regenerating…</span>
          </div>
        ) : (
          <>
            {task.title && (
              <p className="text-sm font-semibold text-white leading-snug">{task.title}</p>
            )}
            <p className="text-sm text-zinc-300 leading-relaxed">{task.description}</p>
            {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
              <ul className="space-y-1 mt-2">
                {task.acceptanceCriteria.map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-500">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-1">
          <span>{task.skillsTested?.slice(0, 3).join(", ") || ""}</span>
          <span>Task {taskIndex + 1} of {totalTasks}</span>
        </div>
      </div>
    </div>
  )
}

// ── Skill pill ────────────────────────────────────────────────────────────────
function SkillPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700/70 bg-zinc-900/60 text-xs text-zinc-300">
      {name}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [assessment, setAssessment] = useState<any>(null)
  const [tasks, setTasks]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [generatedAt]               = useState(new Date())

  const load = useCallback(async () => {
    if (!id || id === "undefined") { setLoading(false); return }
    try {
      const res  = await api.get(`/api/assessments/${id}`)
      const data = await res.json()
      if (data.success) {
        const a = data.data
        setAssessment(a)
        // Tasks: prefer template.suggestedAssessments (always written by generate + regenerate),
        // fall back to templateRef.suggestedAssessments for older assessments.
        const t =
          a.template?.suggestedAssessments?.length > 0
            ? a.template.suggestedAssessments
            : a.templateRef?.suggestedAssessments || []
        setTasks(t)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Derived values
  const title      = assessment?.jobTitle || assessment?.role || "Assessment"
  const level      = assessment?.level || "Mid"
  const lang       = assessment?.template?.ideLanguage || "TypeScript"
  const totalTime  = assessment?.template?.timeLimitMinutes || 60
  const skills: string[] = assessment?.techStack || []
  const bugTypes: string[] = assessment?.template?.bugTypes || []
  const components: string[] = assessment?.template?.components || []
  const numBugs    = tasks.length * 2
  const passThresh = 72

  const elapsed      = Math.floor((Date.now() - generatedAt.getTime()) / 1000)
  const elapsedLabel = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`

  // Regenerate: call backend → Server A re-runs task generation
  const handleRegenerate = async () => {
    if (!id) return
    setIsRegenerating(true)
    try {
      const res  = await api.post(`/api/assessments/${id}/regenerate-tasks`, {
        assessmentPreferences: {
          components,
          ideLanguage: lang,
          timeLimitMinutes: totalTime,
          numTasks: tasks.length,
          bugTypes,
          skills,
        },
      })
      const data = await res.json()
      if (data.success && data.data.tasks) {
        setTasks(data.data.tasks)
      }
    } catch (err: any) {
      console.error("Regenerate failed:", err)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!id || id === "undefined") return
    setPublishing(true)
    try {
      await api.patch(`/api/assessments/${id}/status`, { isActive: true })
      router.push("/dashboard/positions")
    } catch {
      setPublishing(false)
    }
  }

  // Guard: assessment ID missing
  if (!loading && (!id || id === "undefined")) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <RecruiterNavbar />
          <div className="text-center space-y-4">
            <p className="text-zinc-400">Assessment ID missing — something went wrong during generation.</p>
            <Button onClick={() => router.push("/dashboard/positions")} variant="outline">
              ← Back to Positions
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="min-h-screen bg-zinc-950 text-white">
        <RecruiterNavbar />

        <div className="mx-auto max-w-7xl px-6 pt-24 pb-28">
          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading assessment…</span>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="space-y-6">

              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-xs text-zinc-500">
                <button onClick={() => router.push("/dashboard/positions")}
                  className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <ArrowLeft className="h-3 w-3" />Positions
                </button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-zinc-400 truncate max-w-[180px]">{title}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-white font-medium">Review</span>
              </nav>

              {/* Hero */}
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/40 px-8 py-7">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-0.5 text-[11px] font-semibold text-violet-300">
                        <Sparkles className="h-3 w-3" />AI-GENERATED
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[11px] font-semibold text-zinc-400">
                        DRAFT
                      </span>
                      <span className="text-[11px] text-zinc-600">Generated {elapsedLabel} from your JD</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Review your assessment</h1>
                    <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                      AI drafted these tasks from your job description. Review them, regenerate if needed,
                      then publish to start inviting candidates.
                    </p>
                  </div>

                  {/* Stat pills */}
                  <div className="hidden md:flex items-start gap-6 flex-shrink-0 pt-1">
                    {[
                      { label: "DIFFICULTY",     value: level },
                      { label: "COMPONENTS",     value: components.length || tasks.length },
                      { label: "TOTAL TASKS",    value: tasks.length },
                      { label: "BUGS TO INJECT", value: numBugs },
                      { label: "TOTAL TIME",     value: `${totalTime}m` },
                      { label: "PASS THRESHOLD", value: `${passThresh}/100` },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-[9px] font-bold tracking-widest text-zinc-600 uppercase mb-1">{label}</p>
                        {label === "DIFFICULTY" ? (
                          <span className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-semibold text-zinc-200">{value}</span>
                        ) : label === "BUGS TO INJECT" ? (
                          <p className="text-2xl font-bold text-amber-400">{value}</p>
                        ) : (
                          <p className="text-2xl font-bold text-white">{value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

                {/* LEFT — Task cards */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Assessment Tasks</h2>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                        {tasks.length}
                      </span>
                    </div>
                    <button onClick={handleRegenerate} disabled={isRegenerating}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50">
                      <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                      Regenerate All
                    </button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-10 text-center text-sm text-zinc-600">
                      No tasks generated yet. This is unexpected — try regenerating.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task, idx) => (
                        <TaskCard
                          key={`${idx}-${task.id || idx}`}
                          task={task}
                          taskIndex={idx}
                          totalTasks={tasks.length}
                          isRegenerating={isRegenerating}
                        />
                      ))}
                    </div>
                  )}

                  {/* Variants note */}
                  <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-3.5 flex items-start gap-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Each candidate receives a unique code environment built at invite time.
                      The tasks above describe what they will need to fix — {numBugs} intentional bugs
                      will be injected matching the bug types you selected.
                    </p>
                  </div>
                </div>

                {/* RIGHT — Skills + Config */}
                <div className="space-y-4">

                  {/* Skills panel */}
                  <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Tech Stack</span>
                      </div>
                      {skills.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                          {skills.length}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-white">Skills detected</p>

                    {skills.length === 0 ? (
                      <p className="text-sm text-zinc-600">No skills in tech stack.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s: string) => <SkillPill key={s} name={s} />)}
                      </div>
                    )}
                  </div>

                  {/* Bug types panel */}
                  {bugTypes.length > 0 && (
                    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Bug Types</span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                          {bugTypes.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {bugTypes.map((b: string) => (
                          <span key={b} className="inline-flex items-center px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300/80">
                            {b}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600">{numBugs} bugs will be injected ({tasks.length} tasks × 2)</p>
                    </div>
                  )}

                  {/* Configuration panel */}
                  <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-3 w-3 text-zinc-500" />
                      <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Configuration</span>
                    </div>
                    <p className="text-base font-semibold text-white">Assessment settings</p>
                    <div className="space-y-0">
                      {[
                        { label: "Primary language",    value: lang },
                        { label: "Time limit",          value: `${totalTime} min` },
                        { label: "Difficulty",          value: level },
                        { label: "Total tasks",         value: tasks.length },
                        { label: "Bugs to inject",      value: numBugs },
                        { label: "Pass threshold",      value: `${passThresh} / 100` },
                        { label: "Anti-cheat",          value: "Enabled" },
                        { label: "Variants",            value: "Unique per candidate" },
                        { label: "Environment",         value: "Built at invite time" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0">
                          <span className="text-sm text-zinc-500">{label}</span>
                          <span className={`text-sm font-medium ${
                            value === "Enabled"                  ? "text-emerald-400" :
                            value === "Unique per candidate"     ? "text-violet-300"  :
                            value === "Built at invite time"     ? "text-amber-400"   :
                            label  === "Bugs to inject"          ? "text-amber-300"   : "text-zinc-200"
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Fixed bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">{title}</p>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                  DRAFT
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {tasks.length} tasks · {numBugs} bugs · {lang} · {totalTime} min · {level}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button variant="ghost" onClick={() => router.push("/dashboard/positions")}
                className="border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 gap-2">
                <ArrowLeft className="h-4 w-4" />Edit
              </Button>
              <Button onClick={handlePublish} disabled={publishing}
                className="bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2 px-6">
                {publishing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" />Publish Position<ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
