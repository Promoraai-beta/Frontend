"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { AnimatedBackground } from "@/components/animated-background"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { setUser } = useAuth()
  const token = params?.token as string

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("")
  const [isAccepting, setIsAccepting] = useState(false)

  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/invitations/${token}`)
      const data = await response.json()

      if (data.success) {
        setInvitation(data.data)
        if (data.data.email) {
          setEmail(data.data.email)
        }
        if (data.data.companyName) {
          setCompany(data.data.companyName)
        }
      } else {
        setError(data.error || "Invalid invitation")
      }
    } catch (err: any) {
      console.error("Error loading invitation:", err)
      setError("Failed to load invitation. Please check the link and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsAccepting(true)

    try {
      const response = await api.post(`/api/invitations/${token}/accept`, {
        email,
        password,
        name,
        company: company || invitation?.companyName
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Store token and user
        const authToken = data.data.token
        const user = data.data.user
        
        // Store token
        if (typeof window !== "undefined" && authToken) {
          localStorage.setItem("auth_token", authToken)
          localStorage.setItem("jwt_token", authToken)
          if (user) {
            localStorage.setItem("auth_user", JSON.stringify(user))
            localStorage.setItem("recruiter_auth_user", JSON.stringify(user))
          }
        }

        if (user) {
          setUser(user)
          
          // Redirect based on onboarding status
          // Only redirect to onboarding if it's NOT completed (first time)
          // New users will have onboardingCompleted === false
          if (user.onboardingCompleted === false) {
            router.push("/recruiter/onboarding")
          } else {
            // Onboarding completed - go to dashboard
            router.push("/dashboard")
          }
        } else {
          setError("Failed to get user data")
        }
      } else {
        setError(data.error || "Failed to accept invitation")
      }
    } catch (err: any) {
      console.error("Error accepting invitation:", err)
      setError(err.message || "Failed to accept invitation")
    } finally {
      setIsAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
        <AnimatedBackground />
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
        <AnimatedBackground />
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                This invitation link is invalid, expired, or has already been used.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black p-4">
      <AnimatedBackground />
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Recruiter Invitation
          </CardTitle>
          <CardDescription className="text-zinc-400">
            You've been invited to join as a recruiter
            {invitation?.companyName && ` at ${invitation.companyName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-200">
                Full Name <span className="text-red-400">*</span>
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
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="recruiter@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!invitation?.email}
                className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500 disabled:opacity-50"
              />
              {invitation?.email && (
                <p className="text-xs text-zinc-500">
                  This invitation is for {invitation.email}
                </p>
              )}
            </div>
            {!invitation?.companyName && (
              <div className="space-y-2">
                <Label htmlFor="company" className="text-zinc-200">
                  Company Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Inc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required={!invitation?.companyName}
                  className="border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">
                Password <span className="text-red-400">*</span>
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
            <Button 
              type="submit" 
              disabled={isAccepting} 
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept Invitation & Create Account"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

