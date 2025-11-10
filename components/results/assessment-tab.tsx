import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Assessment } from "@/lib/mock-data"
import { Clock, Calendar, FileText, Target } from "lucide-react"

interface AssessmentTabProps {
  assessment: Assessment
  candidateName: string
}

export function AssessmentTab({ assessment, candidateName }: AssessmentTabProps) {
  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-2xl text-white">{assessment.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">Description</h3>
            <p className="text-pretty text-zinc-300">{assessment.description}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <FileText className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Questions</p>
                  <p className="text-xl font-semibold text-white">{assessment.totalQuestions}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Clock className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Duration</p>
                  <p className="text-xl font-semibold text-white">{assessment.duration}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Target className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Passing Score</p>
                  <p className="text-xl font-semibold text-white">{assessment.passingScore}%</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <Calendar className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Time Spent</p>
                  <p className="text-xl font-semibold text-white">{assessment.timeSpent}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-white">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <div className="h-3 w-3 rounded-full bg-black" />
            </div>
            <div>
              <p className="font-semibold text-white">Assessment Started</p>
              <p className="text-sm text-zinc-400">{assessment.attemptedAt}</p>
            </div>
          </div>

          <div className="ml-5 h-12 w-0.5 bg-zinc-800" />

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <div className="h-3 w-3 rounded-full bg-black" />
            </div>
            <div>
              <p className="font-semibold text-white">Assessment Submitted</p>
              <p className="text-sm text-zinc-400">{assessment.submittedAt}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-white">Candidate Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Name</span>
              <span className="font-semibold text-white">{candidateName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Assessment ID</span>
              <span className="font-mono text-sm text-white">{assessment.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
