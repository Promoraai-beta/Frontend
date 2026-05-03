"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Loader2, X, Clock, Minus, Plus as PlusIcon, Sparkles, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"

interface CreateAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ── Brand SVG icons ────────────────────────────────────────────────────────
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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.881V4.118a1.5 1.5 0 0 0-.85-1.531zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/>
    </svg>
  )
}

function WordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="3" width="20" height="18" rx="2" opacity="0.15"/>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <text x="5" y="16" fontSize="9" fontWeight="800" fill="currentColor">W</text>
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

// iOS-style toggle
function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`relative flex-shrink-0 h-[26px] w-[46px] rounded-full transition-all duration-200 ${on ? "bg-violet-600" : "bg-zinc-700"}`}>
      <div className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
    </div>
  )
}

// ── Skill categories ─────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  lang: "Languages",
  framework: "Frameworks & Libraries",
  db: "Databases",
  cloud: "Cloud & DevOps",
  concept: "Concepts",
}

// Skill shape returned by the API
interface SkillItem { name: string; category: string }

// ── Component definitions — 5 total ──────────────────────────────────────────
const COMPONENT_DEFS = [
  { key: "ide_project", Icon: VsCodeIcon,    label: "Code Editor",          desc: "Build a real feature in a live IDE." },
  { key: "leetcode",    Icon: BracketsIcon,  label: "Coding Problems",      desc: "Algorithmic challenges, multiple difficulty." },
  { key: "database",    Icon: PostgresIcon,  label: "Database Challenge",   desc: "Author and optimize SQL queries in PostgreSQL." },
  { key: "docs",        Icon: WordIcon,      label: "Written Explanation",  desc: "Documentation and rationale." },
  { key: "sheets",      Icon: ExcelIcon,     label: "Spreadsheet Challenge",desc: "Pivot, model, and analyze data." },
] as const

const GENERATING_STAGES = [
  "Reading job description…",
  "Identifying tech stack & seniority…",
  "Generating AI assessment tasks…",
  "Finalising assessment…",
]

export function CreateAssessmentModal({ open, onOpenChange, onSuccess }: CreateAssessmentModalProps) {
  const { user } = useAuth()
  const router = useRouter()

  const [jobTitle, setJobTitle]             = useState("")
  const [jobDescription, setJobDescription] = useState("")

  const [assessmentComponents, setAssessmentComponents] = useState<Record<string, boolean>>({
    ide_project: true, leetcode: false, database: false, docs: true, sheets: false,
  })
  const toggleComponent = (key: string) =>
    setAssessmentComponents(prev => ({ ...prev, [key]: !prev[key] }))

  // ── Skills extraction state ────────────────────────────────────────────────
  const [isExtracting, setIsExtracting]   = useState(false)
  const [hasExtracted, setHasExtracted]   = useState(false)
  const [extractedSkills, setExtractedSkills] = useState<SkillItem[]>([])
  const [selectedSkills, setSelectedSkills]   = useState<Set<string>>(new Set())
  const [ideLanguage, setIdeLanguage]         = useState("TypeScript")

  const toggleSkill = (name: string) =>
    setSelectedSkills(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const handleExtract = async () => {
    setIsExtracting(true)
    try {
      if (!jobDescription.trim() || !jobTitle.trim()) { setIsExtracting(false); return }

      const res  = await api.post("/api/assessments/extract-skills", { jobTitle, jobDescription })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || "Extraction failed")

      const {
        skills,
        ideLanguage: suggestedLang,
        suggestedComponents,
        suggestedNumTasks,
        suggestedBugTypes,
      } = data.data

      setExtractedSkills(skills || [])
      setSelectedSkills(new Set((skills || []).map((s: SkillItem) => s.name)))

      // Apply AI-suggested IDE language
      if (suggestedLang) setIdeLanguage(suggestedLang)

      // Apply AI-suggested components
      if (suggestedComponents && suggestedComponents.length > 0) {
        const suggested = new Set(suggestedComponents as string[])
        setAssessmentComponents({
          ide_project: suggested.has("ide_project"),
          leetcode:    suggested.has("leetcode"),
          database:    suggested.has("database"),
          docs:        suggested.has("docs"),
          sheets:      suggested.has("sheets"),
        })
      }

      // Apply AI-suggested task count
      if (suggestedNumTasks) {
        setJdRecommendedTasks(suggestedNumTasks)
        setNumTasks(null) // snap to AI recommendation
      }

      // Apply AI-suggested bug types
      if (suggestedBugTypes && suggestedBugTypes.length > 0) {
        setSelectedBugTypes(new Set(suggestedBugTypes as string[]))
      }

      setHasExtracted(true)
    } catch (err: any) {
      alert(`Extract failed: ${err.message || "Unknown error"}`)
    } finally {
      setIsExtracting(false)
    }
  }

  // Group extracted skills by category
  const skillsByCategory = extractedSkills.reduce((acc: Record<string, string[]>, skill: SkillItem) => {
    if (!acc[skill.category]) acc[skill.category] = []
    acc[skill.category].push(skill.name)
    return acc
  }, {} as Record<string, string[]>)

  const [timeLimit, setTimeLimit]   = useState(60)
  const [numTasks, setNumTasks]     = useState<number | null>(null) // null = use AI recommendation
  const [jdRecommendedTasks, setJdRecommendedTasks] = useState<number | null>(null)
  const [selectedBugTypes, setSelectedBugTypes] = useState<Set<string>>(new Set(["Logic Errors", "Edge Cases", "Null Handling"]))

  // Compute AI-recommended task count — updates after JD extraction
  const activeCount = Object.values(assessmentComponents).filter(Boolean).length
  const recommendedTasks = jdRecommendedTasks ?? Math.min(10, Math.max(3, activeCount * 2 + Math.floor(timeLimit / 60) - 1))
  const effectiveTasks = numTasks ?? recommendedTasks

  const toggleBugType = (name: string) =>
    setSelectedBugTypes(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const [isGenerating, setIsGenerating]       = useState(false)
  const [generatingStage, setGeneratingStage] = useState(0)

  useEffect(() => {
    if (!isGenerating) { setGeneratingStage(0); return }
    const id = setInterval(() =>
      setGeneratingStage(s => Math.min(s + 1, GENERATING_STAGES.length - 1))
    , 7000)
    return () => clearInterval(id)
  }, [isGenerating])

  useEffect(() => {
    if (!open) {
      setJobTitle(""); setJobDescription("")
      setAssessmentComponents({ ide_project: true, leetcode: false, database: false, docs: true, sheets: false })
      setIsExtracting(false); setHasExtracted(false)
      setExtractedSkills([]); setSelectedSkills(new Set())
      setIdeLanguage("TypeScript"); setTimeLimit(60); setNumTasks(null); setJdRecommendedTasks(null)
      setSelectedBugTypes(new Set(["Logic Errors", "Edge Cases", "Null Handling"]))
      setIsGenerating(false)
    }
  }, [open])

  const assessmentPreferences = () => ({
    components:       Object.entries(assessmentComponents).filter(([, on]) => on).map(([k]) => k),
    ideLanguage:      ideLanguage.toLowerCase(),
    timeLimitMinutes: timeLimit,
    numTasks:         effectiveTasks,
    bugTypes:         Array.from(selectedBugTypes),
    skills:           Array.from(selectedSkills),
  })

  const canGenerate =
    !!jobTitle &&
    !!jobDescription &&
    activeCount > 0

  const handleGenerate = async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    try {
      const payload = { jobTitle, jobDescription, assessmentPreferences: assessmentPreferences(), ...(user?.company && { company: user.company }) }

      const res  = await api.post("/api/assessments/generate", payload)
      const data = await res.json()

      if (data.success) {
        const assessmentId = data.data.assessmentId || data.data.id
        onSuccess?.()
        onOpenChange(false)
        // Review page fetches everything from the DB — only the ID is needed
        router.push(`/dashboard/positions/${assessmentId}/review`)
      } else {
        alert(`Failed: ${data.error || "Unknown error"}`)
      }
    } catch (e: any) {
      alert(`Error: ${e.message || "Failed to generate"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800/80 text-white w-[98vw] max-w-7xl sm:max-w-[95vw] lg:max-w-7xl p-0 gap-0 overflow-hidden flex flex-col h-[90vh] [&>button]:hidden">
        <VisuallyHidden.Root><DialogTitle>Create a Position</DialogTitle></VisuallyHidden.Root>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800/80 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Create a Position</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Generate an AI-powered technical assessment from your job description</p>
          </div>
          <button onClick={() => onOpenChange(false)}
            className="rounded-xl p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT — 55% */}
          <div className="flex flex-col w-[55%] border-r border-zinc-800/80 overflow-y-auto">
            <div className="p-8 space-y-5 flex-1">

              {/* Position title */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Position Title</label>
                <Input
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="bg-zinc-900/80 border-zinc-700/80 text-white text-base h-11 placeholder:text-zinc-600 focus:border-zinc-500 rounded-xl"
                />
              </div>

              {/* Job Description */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Job Description</label>
                <Textarea
                  value={jobDescription}
                  onChange={e => { setJobDescription(e.target.value); if (hasExtracted) setHasExtracted(false) }}
                  placeholder="Paste your full job description here, then click Extract Skills to identify the tech stack and requirements."
                  className="bg-zinc-900/80 border-zinc-700/80 text-white text-sm resize-none placeholder:text-zinc-600 focus:border-zinc-500 rounded-xl min-h-[220px] leading-relaxed"
                />
              </div>

              {/* Extract Skills button */}
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || !jobDescription.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Extracting skills…</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Extract Skills from JD<ChevronRight className="h-4 w-4 ml-auto" /></>
                )}
              </button>

              {/* Extracted skills */}
              {hasExtracted && extractedSkills.length > 0 && (
                <div className="space-y-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Extracted Skills</span>
                      <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                        {selectedSkills.size} / {extractedSkills.length} selected
                      </span>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <button onClick={() => setSelectedSkills(new Set(extractedSkills.map(s => s.name)))}
                        className="text-zinc-400 hover:text-white transition-colors">All</button>
                      <span className="text-zinc-700">·</span>
                      <button onClick={() => setSelectedSkills(new Set())}
                        className="text-zinc-400 hover:text-white transition-colors">None</button>
                    </div>
                  </div>

                  {Object.entries(skillsByCategory).map(([cat, names]) => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">{CATEGORY_LABELS[cat]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {names.map(name => {
                          const on = selectedSkills.has(name)
                          return (
                            <button key={name} onClick={() => toggleSkill(name)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                on
                                  ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                                  : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                              }`}>
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasExtracted && extractedSkills.length === 0 && (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 text-sm text-zinc-500 text-center">
                  No specific technologies detected. You can still generate the assessment.
                </div>
              )}

            </div>
          </div>

          {/* RIGHT — 45% */}
          <div className="w-[45%] overflow-y-auto bg-zinc-950/40">
            <div className="p-8 space-y-7">

              {/* WHAT TO ASSESS — 2-col grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">What to Assess</label>
                  <span className="text-xs font-bold text-zinc-300 tabular-nums bg-zinc-800 px-2 py-0.5 rounded-full">
                    {activeCount} / 5 on
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {COMPONENT_DEFS.map(({ key, Icon, label, desc }) => {
                    const on = assessmentComponents[key]
                    return (
                      <button key={key} type="button" onClick={() => toggleComponent(key)}
                        className={`relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-150 ${
                          on
                            ? "border-violet-500/60 bg-violet-900/25"
                            : "border-zinc-800/70 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${on ? "bg-violet-600" : "bg-zinc-800"}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <Toggle on={on} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${on ? "text-white" : "text-zinc-300"}`}>{label}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {activeCount === 0 && (
                  <p className="text-xs text-amber-400 mt-2.5 flex items-center gap-1.5">
                    <span>⚠</span> Select at least one component.
                  </p>
                )}
              </div>


              {/* NUMBER OF TASKS + BUG TYPES — revealed after extraction */}
              {hasExtracted && <div className="space-y-7">

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Number of Tasks</label>
                  {numTasks !== null && (
                    <button onClick={() => setNumTasks(null)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
                      Reset to AI ({recommendedTasks})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setNumTasks(t => Math.max(1, (t ?? recommendedTasks) - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-white tabular-nums">{effectiveTasks}</span>
                    {numTasks === null && (
                      <span className="text-[10px] text-violet-400 font-medium mt-0.5">
                        {jdRecommendedTasks ? "from JD analysis" : "AI recommended"}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => setNumTasks(t => Math.min(15, (t ?? recommendedTasks) + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* NUM BUGS — derived, read-only */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Bugs to Inject</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Always 2× number of tasks</p>
                </div>
                <span className="text-3xl font-bold text-amber-400 tabular-nums">{effectiveTasks * 2}</span>
              </div>

              {/* BUG TYPES — always visible */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
                    Bug Types to Include
                  </label>
                  {hasExtracted && (
                    <span className="text-[10px] text-violet-400 font-medium">auto-selected from JD</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Logic Errors", "Edge Cases", "Off-by-one",
                    "Null Handling", "Race Conditions", "Security Flaws",
                    "Memory Leaks", "Type Errors", "API Errors", "Performance",
                  ].map(bug => {
                    const on = selectedBugTypes.has(bug)
                    return (
                      <button key={bug} onClick={() => toggleBugType(bug)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                          on
                            ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                            : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                        }`}>
                        {bug}
                      </button>
                    )
                  })}
                </div>
              </div>

              </div>}

              {/* TIME LIMIT */}
              <div>
                <label className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3 block">Time Limit</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setTimeLimit(t => Math.max(15, t - 15))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-white tabular-nums">{timeLimit}</span>
                    <span className="text-sm text-zinc-500">min</span>
                  </div>
                  <button type="button" onClick={() => setTimeLimit(t => Math.min(180, t + 15))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-600">
                  <Clock className="h-3 w-3" />~52m avg completion time
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex-shrink-0 border-t border-zinc-800/80 bg-zinc-950 px-8 py-4 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {jobTitle || <span className="text-zinc-600 font-normal italic">Untitled Position</span>}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {activeCount} component{activeCount !== 1 ? "s" : ""}
              {` · ${effectiveTasks} tasks · ${effectiveTasks * 2} bugs`}
              {selectedSkills.size > 0 ? ` · ${selectedSkills.size} skills` : ""}
              {` · ${timeLimit}m`}
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="bg-white text-black hover:bg-zinc-100 font-semibold gap-2 flex-shrink-0 h-11 px-6 text-sm disabled:opacity-30 rounded-xl"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{GENERATING_STAGES[generatingStage]}</>
            ) : (
              "✦ Generate & Save Position →"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
