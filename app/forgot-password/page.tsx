"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedBackground } from "@/components/animated-background"
import { API_BASE_URL } from "@/lib/config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect to reset password page with email
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email)}`)
        }, 2000)
      } else {
        setError(data.error || "Failed to send reset code")
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset code")
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
          <CardTitle className="text-2xl font-bold text-white">Forgot Password</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email address and we'll send you a verification code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-900/20 border border-green-800 p-4">
                <p className="text-sm text-green-400">
                  Verification code sent! Check your email and redirecting to reset page...
                </p>
              </div>
            </div>
          ) : (
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
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200">
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm text-zinc-400">
            Remember your password?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

