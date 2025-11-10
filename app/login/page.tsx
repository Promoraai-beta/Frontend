"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { API_BASE_URL } from "@/lib/config"

function LoginForm() {
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
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await login(email, password)
      if (user) {
        setUser(user)

        // Check if user came from an assessment session
        const sessionId = searchParams.get('sessionId')
        
        if (sessionId && user.role === 'candidate') {
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

        // Default redirect based on role and onboarding status
        // Onboarding should only happen once - if completed, go directly to dashboard
        if (user.role === "admin") {
          router.push("/admin/dashboard")
        } else if (user.role === "recruiter") {
          // Only redirect to onboarding if it's NOT completed (first time)
          if (user.onboardingCompleted === false) {
            router.push("/recruiter/onboarding")
          } else {
            // Onboarding completed or not set - go to dashboard
            router.push("/dashboard")
          }
        } else if (user.role === "candidate") {
          // Only redirect to onboarding if it's NOT completed (first time)
          if (user.onboardingCompleted === false) {
            router.push("/candidate/onboarding")
          } else {
            // Onboarding completed or not set - go to assessments
            router.push("/candidate/assessments")
          }
        } else {
          // Default to dashboard if role is unknown
          router.push("/dashboard")
        }
      } else {
        setError("Invalid email or password")
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
      <AnimatedBackground />
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">Welcome back</CardTitle>
          <CardDescription className="text-zinc-400">Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="XYZ@gmail.com"
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
                className="border-zinc-800 bg-zinc-900 text-white"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-white hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
