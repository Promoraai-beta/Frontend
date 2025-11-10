"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AssessmentResult } from "@/lib/mock-data"
import { CheckCircle2, XCircle, Play, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ResultTabProps {
  result: AssessmentResult
}

export function ResultTab({ result }: ResultTabProps) {
  const satisfiedCompliances = result.compliances.filter((c) => c.satisfied).length
  const totalCompliances = result.compliances.length

  const handleDownloadReport = () => {
    // In a real app, this would generate and download a PDF report
    console.log("Downloading report...")
  }

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">Assessment Score</CardTitle>
            <Button onClick={handleDownloadReport} className="gap-2 bg-white text-black hover:bg-zinc-200">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-5xl font-bold text-white">{result.percentage}%</p>
              <p className="mt-2 text-zinc-400">
                {result.score} out of {result.totalScore} points
              </p>
            </div>
            <div>
              {result.passed ? (
                <Badge className="bg-green-500/10 px-4 py-2 text-lg text-green-500">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Passed
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 px-4 py-2 text-lg text-red-500">
                  <XCircle className="mr-2 h-5 w-5" />
                  Failed
                </Badge>
              )}
            </div>
          </div>
          <Progress value={result.percentage} className="h-3" />
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-white">AI Proctoring Videos</CardTitle>
          <p className="text-sm text-zinc-400">Candidate and screen recordings during assessment</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Candidate Video */}
            <div>
              <p className="mb-2 text-sm font-medium text-white">Candidate Video</p>
              <div className="group relative aspect-video overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                      <Play className="h-8 w-8 fill-current text-black" />
                    </div>
                    <p className="text-sm text-zinc-400">Webcam recording</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Recording */}
            <div>
              <p className="mb-2 text-sm font-medium text-white">Screen Recording</p>
              <div className="group relative aspect-video overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
                      <Play className="h-8 w-8 fill-current text-black" />
                    </div>
                    <p className="text-sm text-zinc-400">Screen capture</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Checks */}
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Compliance Monitoring</CardTitle>
            <Badge
              variant="outline"
              className={
                satisfiedCompliances === totalCompliances
                  ? "border-green-500 text-green-500"
                  : "border-yellow-500 text-yellow-500"
              }
            >
              {satisfiedCompliances}/{totalCompliances} Satisfied
            </Badge>
          </div>
          <p className="text-sm text-zinc-400">Real-time AI monitoring of assessment compliance rules</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.compliances.map((compliance) => (
            <div
              key={compliance.id}
              className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="mt-1">
                {compliance.satisfied ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-semibold text-white">{compliance.rule}</h4>
                  {!compliance.satisfied && (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-500">
                      {compliance.violationCount} violation(s)
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{compliance.description}</p>
                {compliance.timestamp && (
                  <p className="mt-2 text-xs text-zinc-500">Last checked: {compliance.timestamp}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sample Answers (Optional) */}
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-white">Sample Answers</CardTitle>
          <p className="text-sm text-zinc-400">Preview of candidate responses</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.answers.slice(0, 3).map((answer) => (
            <div key={answer.questionId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <p className="font-semibold text-white">{answer.question}</p>
                {answer.correct ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="mb-2 text-sm text-zinc-300">{answer.answer}</p>
              <p className="text-xs text-zinc-500">
                Points: {answer.points}/{answer.points}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
