"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedBackground } from "@/components/animated-background"
import { API_BASE_URL } from "@/lib/config"
import { Eye, EyeOff } from "lucide-react"

function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<"verify" | "reset">("verify")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get email and token from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const tokenParam = searchParams.get('token')
    
    if (emailParam) {
      setEmail(emailParam)
    }
    
    if (tokenParam) {
      setResetToken(tokenParam)
      setStep("reset") // Skip verification if token is provided
    }
  }, [searchParams])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      })

      if (!response.ok) {
        // Handle non-200 responses
        const errorText = await response.text()
        let errorMessage = "Failed to verify code"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || `Server error: ${response.status}`
        }
        setError(errorMessage)
        return
      }

      const data = await response.json()

      if (data.success && data.data?.token) {
        setResetToken(data.data.token)
        setStep("reset")
      } else {
        setError(data.error || "Invalid verification code")
      }
    } catch (err: any) {
      console.error("Verify code error:", err)
      setError(err.message || "Failed to verify code. Please check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (!resetToken) {
      setError("Reset token is missing. Please request a new password reset.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: resetToken, password }),
      })

      if (!response.ok) {
        // Handle non-200 responses
        const errorText = await response.text()
        let errorMessage = "Failed to reset password"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || `Server error: ${response.status}`
        }
        setError(errorMessage)
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data.error || "Failed to reset password")
      }
    } catch (err: any) {
      console.error("Reset password error:", err)
      setError(err.message || "Failed to reset password. Please check your connection.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
            <CardTitle className="text-2xl font-bold text-white">Password Reset Successful</CardTitle>
            <CardDescription className="text-zinc-400">
              Your password has been reset. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-green-900/20 border border-green-800 p-4">
              <p className="text-sm text-green-400">
                You can now sign in with your new password.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold text-white">
            {step === "verify" ? "Verify Code" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {step === "verify"
              ? "Enter the verification code sent to your email"
              : "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "verify" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
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
                <Label htmlFor="code" className="text-zinc-200">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="border-zinc-800 bg-zinc-900 text-white text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-zinc-500">Enter the 6-digit code from your email</p>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200">
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-zinc-800 bg-zinc-900 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-200">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-zinc-800 bg-zinc-900 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200">
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm text-zinc-400">
            <Link href="/login" className="text-white hover:underline">
              Back to Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

