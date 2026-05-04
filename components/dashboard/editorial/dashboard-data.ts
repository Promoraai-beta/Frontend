/** Pure helpers for recruiter editorial dashboard (charts, activity). */

export type ChartPeriod = "7d" | "30d" | "90d"

export function countSubmittedBetween(
  sessions: Array<{ status?: string; submittedAt?: string | Date | null; createdAt?: string | Date | null }>,
  start: Date,
  end: Date
) {
  return sessions.filter((s) => {
    if (s.status !== "submitted") return false
    const d = new Date(s.submittedAt || s.createdAt || 0)
    return d >= start && d < end
  }).length
}

export function submissionBucketsForPeriod(
  sessions: Array<{ status?: string; submittedAt?: string | Date | null; createdAt?: string | Date | null }>,
  period: ChartPeriod
): { label: string; value: number }[] {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  if (period === "7d") {
    const out: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(now.getDate() - i)
      day.setHours(0, 0, 0, 0)
      const next = new Date(day)
      next.setDate(day.getDate() + 1)
      const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const value = countSubmittedBetween(sessions, day, next)
      out.push({ label, value })
    }
    return out
  }

  const weeks =
    period === "30d"
      ? 5
      : 13

  const out: { label: string; value: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - i * 7)
    weekEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const value = countSubmittedBetween(sessions, weekStart, new Date(weekEnd.getTime() + 1))
    out.push({ label, value })
  }
  return out
}

export function completedAssessmentsThisWeek(
  sessions: Array<{ status?: string; submittedAt?: string | Date | null; createdAt?: string | Date | null }>
) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return countSubmittedBetween(sessions, start, new Date(end.getTime() + 1))
}

export function completedAssessmentsPrevWeek(sessions: Array<{ status?: string; submittedAt?: string | Date | null; createdAt?: string | Date | null }>) {
  const now = new Date()
  const end = new Date(now)
  end.setDate(now.getDate() - 7)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(end.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return countSubmittedBetween(sessions, start, new Date(end.getTime() + 1))
}

export interface ActivityItem {
  who: string
  did: string
  role: string
  iq: number | string
  when: string
  sessionId?: string
}

export function buildActivityFeed(
  sessions: Array<Record<string, unknown>>,
  assessmentTitle: (assessmentId: string) => string,
  limit = 6
): ActivityItem[] {
  const scored = [...sessions]
    .map((s) => {
      const sid = String(s.id || "")
      const assessmentId = String(s.assessmentId || s.assessment_id || "")
      const name = String(s.candidateName || s.candidate_name || "Candidate")
      const status = String(s.status || "")
      const score = s.score != null ? Number(s.score) : null
      let t = 0
      const ts =
        (s.submittedAt && new Date(String(s.submittedAt)).getTime()) ||
        (s.updatedAt && new Date(String(s.updatedAt)).getTime()) ||
        (s.updated_at && new Date(String(s.updated_at)).getTime()) ||
        (s.startedAt && new Date(String(s.startedAt)).getTime()) ||
        (s.started_at && new Date(String(s.started_at)).getTime()) ||
        (s.createdAt && new Date(String(s.createdAt)).getTime()) ||
        (s.created_at && new Date(String(s.created_at)).getTime()) ||
        0
      t = typeof ts === "number" && !Number.isNaN(ts) ? ts : 0

      return { sid, assessmentId, name, status, score, t }
    })
    .filter((x) => x.t > 0)
    .sort((a, b) => b.t - a.t)
    .slice(0, limit)

  const fmt = (ms: number) => {
    const sec = Math.floor((Date.now() - ms) / 1000)
    if (sec < 60) return `${Math.max(1, sec)}s`
    if (sec < 3600) return `${Math.floor(sec / 60)}m`
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`
    return `${Math.floor(sec / 86400)}d`
  }

  return scored.map((s) => {
    let did = "updated session"
    if (s.status === "submitted") did = "completed assessment"
    else if (s.status === "active") did = "in progress"
    else if (s.status === "pending") did = "invited"

    const iq = s.score != null && !Number.isNaN(s.score) ? s.score : "—"
    return {
      who: s.name,
      did,
      role: assessmentTitle(s.assessmentId) || "Role",
      iq,
      when: fmt(s.t),
      sessionId: s.sid,
    }
  })
}

export function avgPromptIQFromSubmissions(
  submissions: Array<{ sessionId?: string; session_id?: string; score?: number | null }>,
  sessionIds: Set<string>
) {
  const relevant = submissions.filter((sub) => sessionIds.has(String(sub.sessionId || sub.session_id)))
  if (!relevant.length) return 0
  const sum = relevant.reduce((a, b) => a + (Number(b.score) || 0), 0)
  return Math.round(sum / relevant.length)
}
