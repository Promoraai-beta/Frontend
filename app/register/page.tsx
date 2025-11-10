"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { register } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { API_BASE_URL, ADMIN_EMAIL } from "@/lib/config"

function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAuth()

  // Pre-fill email from URL params if provided (from assessment signup)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const sessionIdParam = searchParams.get('sessionId')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Only allow candidate registration - recruiters must use invitation links
      const user = await register(email, password, name, undefined, "candidate")
      setUser(user)

      // Check if user came from an assessment session
      const sessionId = searchParams.get('sessionId')
      
      if (sessionId) {
        // Session will be automatically linked when accessed with authenticated account
        // Get session details to determine redirect
        try {
          const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          const sessionData = await sessionResponse.json()
          
          if (sessionData.success && sessionData.data) {
            const assessmentType = sessionData.data.assessment?.assessmentType
            // Redirect to results if candidate assessment, otherwise to dashboard
            if (assessmentType === 'candidate') {
              router.push(`/candidate/results/${sessionId}`)
              return
            } else {
              // Recruiter assessment - redirect to dashboard
              router.push('/candidate/assessments')
              return
            }
          }
        } catch (sessionError) {
          console.warn('Failed to fetch session details:', sessionError)
          // Continue with default redirect
        }
      }

      // Default redirect: onboarding if not completed, otherwise to assessments
      if (!user.onboardingCompleted) {
        router.push("/candidate/onboarding")
      } else {
        router.push("/candidate/assessments")
      }
    } catch (err: any) {
      setError(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
      <AnimatedBackground />
      {/* Floating Logo - styled like navbar for seamless UI */}
      <div className="fixed left-1/2 top-4 z-50 w-[90%] max-w-6xl -translate-x-1/2 md:w-[75%]">
        <Link 
          href="/"
          className="group block"
        >
          <div className="rounded-full border border-zinc-800 bg-black/60 backdrop-blur-md px-6 py-3 shadow-lg transition-all duration-300 hover:bg-black/70 hover:border-zinc-700 hover:shadow-xl cursor-pointer">
            <span className="text-xl font-bold text-white transition-all duration-300 group-hover:text-zinc-200 md:text-2xl inline-flex items-center gap-2">
              PromoraAI
              <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-400">
                ← Home
              </span>
            </span>
          </div>
        </Link>
      </div>
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">Create Candidate Account</CardTitle>
          <CardDescription className="text-zinc-400">Sign up to take AI-powered assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-200">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="JohnDoe@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="border-zinc-800 bg-zinc-900 text-white"
              />
              <p className="text-xs text-zinc-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200">
              {isLoading ? "Creating account..." : "Create Candidate Account"}
            </Button>
          </form>
          <div className="mt-4 space-y-2">
            <div className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:underline">
                Sign in
              </Link>
            </div>
            <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-800">
              <p>
                Are you a recruiter?{" "}
                <a
                  href={`mailto:${ADMIN_EMAIL}?subject=Recruiter Invitation Request&body=Hello,%0D%0A%0D%0AI would like to request a recruiter invitation link for PromoraAI.%0D%0A%0D%0ACompany Name:%0D%0AEmail Address:%0D%0A%0D%0AThank you!`}
                  className="text-zinc-300 hover:text-white underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
