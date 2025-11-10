"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CandidateNavbar } from "@/components/candidate/candidate-navbar"
import { AnimatedBackground } from "@/components/animated-background"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function PracticeArena() {
  const router = useRouter()

  // Redirect to dashboard - Practice feature is currently hidden
  // This feature will be available in future releases when candidates can access
  // practice assessments from other candidates or the community
  useEffect(() => {
    router.push("/candidate")
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="relative min-h-screen bg-black">
      <AnimatedBackground />
      <CandidateNavbar />
      <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28 flex items-center justify-center">
        <Card className="border-zinc-800 bg-zinc-950 max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Redirecting...</CardTitle>
            <CardDescription className="text-zinc-400">
              Practice feature is currently unavailable. Redirecting to dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  )
}
