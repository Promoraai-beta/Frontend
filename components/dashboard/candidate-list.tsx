import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Candidate } from "@/lib/mock-data"
import { Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface CandidateListProps {
  candidates: Candidate[]
  jobTitle: string
}

export function CandidateList({ candidates, jobTitle }: CandidateListProps) {
  const getStatusBadge = (status: Candidate["assessmentStatus"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500">Completed</Badge>
      case "in-progress":
        return <Badge className="bg-yellow-500/10 text-yellow-500">In Progress</Badge>
      case "not-started":
        return <Badge className="bg-zinc-700 text-zinc-300">Not Started</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{jobTitle}</h2>
        <p className="text-sm text-zinc-400">{candidates.length} candidates</p>
      </div>

      <div className="space-y-3">
        {candidates.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-950">
            <CardContent className="p-6 text-center">
              <p className="text-zinc-400">No candidates have taken this assessment yet.</p>
            </CardContent>
          </Card>
        ) : (
          candidates.map((candidate) => (
          <Card key={candidate.id} className="border-zinc-800 bg-zinc-950">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                    {getStatusBadge(candidate.assessmentStatus)}
                  </div>
                  <p className="mb-4 text-sm text-zinc-400">{candidate.email}</p>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {candidate.score !== undefined && (
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Score</p>
                        <p className="text-lg font-semibold text-white">{candidate.score}%</p>
                      </div>
                    )}
                    {candidate.attemptedAt && (
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Attempted At</p>
                        <p className="text-sm text-zinc-300">{candidate.attemptedAt}</p>
                      </div>
                    )}
                    {candidate.submittedAt && (
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Submitted At</p>
                        <p className="text-sm text-zinc-300">{candidate.submittedAt}</p>
                      </div>
                    )}
                    {candidate.duration && (
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500">Duration</p>
                        <div className="flex items-center gap-1 text-sm text-zinc-300">
                          <Clock className="h-3 w-3" />
                          <span>{candidate.duration}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {candidate.complianceViolations > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-yellow-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{candidate.complianceViolations} compliance violation(s) detected</span>
                    </div>
                  )}
                </div>

                {candidate.assessmentStatus === "completed" && (
                  <Button asChild className="bg-white text-black hover:bg-zinc-200">
                    <Link href={`/dashboard/results/${candidate.sessionId || candidate.id}`}>View Result</Link>
                  </Button>
                )}
                {candidate.assessmentStatus === "in-progress" && (
                  <Button asChild variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800">
                    <Link href={`/dashboard/live/${candidate.sessionId || candidate.id}`}>View Live</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )))}
      </div>
    </div>
  )
}
