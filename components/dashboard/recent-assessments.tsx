"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Clock, CheckCircle, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

export function RecentAssessments() {
  const [recentAssessments, setRecentAssessments] = useState<any[]>([])

  useEffect(() => {
    // Only fetch in browser
    if (typeof window === 'undefined') return;
    
    api.get('/api/sessions')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Get recent sessions, limit to 4
          const sessions = (data.data || [])
            .sort((a: any, b: any) => {
              const aTime = new Date(a.submittedAt || a.startedAt || a.createdAt || 0).getTime()
              const bTime = new Date(b.submittedAt || b.startedAt || b.createdAt || 0).getTime()
              return bTime - aTime
            })
            .slice(0, 4)
            .map((s: any) => ({
              id: s.id,
              candidate: s.candidateName || s.candidate_name || 'Unknown',
              time: formatDistanceToNow(new Date(s.submittedAt || s.startedAt || s.createdAt || Date.now()), { addSuffix: true }),
              status: s.status === 'submitted' ? 'completed' : s.status === 'active' ? 'in-progress' : 'pending',
              promptIQ: s.promptIQ || 0
            }))
          setRecentAssessments(sessions)
        }
      })
      .catch(err => {
        console.error('Error loading recent assessments:', err);
        // Silently fail - show empty state instead of error
      })
  }, [])
  return (
    <Card className="border-zinc-800 bg-zinc-950/50 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Assessments</h3>
        <Clock className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="space-y-3">
        {recentAssessments.map((assessment) => (
          <div
            key={assessment.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/30 p-3 transition-all hover:border-zinc-700"
          >
            <div className="flex items-center gap-3">
              {assessment.status === "completed" && <CheckCircle className="h-4 w-4 text-emerald-400" />}
              {assessment.status === "flagged" && <AlertCircle className="h-4 w-4 text-amber-400" />}
              {assessment.status === "in-progress" && <Clock className="h-4 w-4 text-blue-400" />}
              {assessment.status === "pending" && <Clock className="h-4 w-4 text-zinc-400" />}
              <div>
                <p className="text-sm font-medium text-white">{assessment.candidate}</p>
                <p className="text-xs text-zinc-500">{assessment.time}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{assessment.promptIQ}</div>
              <div className="text-xs text-zinc-500">PromptIQ</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
