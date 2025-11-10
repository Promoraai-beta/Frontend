"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CheckCircle, X, UserPlus, Home } from "lucide-react"

interface SignupPromptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: string | null
  candidateEmail?: string | null
  candidateName?: string | null
  onSignupSuccess?: () => void
}

export function SignupPromptModal({
  open,
  onOpenChange,
  sessionId,
  candidateEmail,
  candidateName,
  onSignupSuccess
}: SignupPromptModalProps) {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSignup = () => {
    // Redirect to register page with session info
    // The session will be linked when they register with the same email
    setIsRedirecting(true)
    const params = new URLSearchParams()
    if (sessionId) params.set('sessionId', sessionId)
    if (candidateEmail) params.set('email', candidateEmail)
    router.push(`/register?${params.toString()}`)
  }

  const handleSkip = () => {
    // Redirect to home page
    setIsRedirecting(true)
    router.push('/')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Assessment Completed!
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Sign up to view your assessment results and track your progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-emerald-300 text-sm font-medium mb-2">
              🎉 Great job completing the assessment!
            </p>
            <p className="text-zinc-400 text-sm">
              Create a free account to:
            </p>
            <ul className="text-zinc-400 text-sm mt-2 space-y-1 ml-4">
              <li>• View detailed assessment results</li>
              <li>• Track your progress over time</li>
              <li>• Access your assessment history</li>
              <li>• Get personalized feedback</li>
            </ul>
          </div>

          {candidateEmail && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                💡 Tip: Use <strong>{candidateEmail}</strong> when signing up to automatically link this assessment to your account.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              disabled={isRedirecting}
            >
              <Home className="h-4 w-4 mr-2" />
              Skip for Now
            </Button>
            <Button
              onClick={handleSignup}
              className="flex-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              disabled={isRedirecting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isRedirecting ? 'Redirecting...' : 'Sign Up'}
            </Button>
          </div>

          <p className="text-zinc-500 text-xs text-center">
            Already have an account?{" "}
            <button
              onClick={() => {
                const params = new URLSearchParams()
                if (sessionId) params.set('sessionId', sessionId)
                if (candidateEmail) params.set('email', candidateEmail)
                router.push(`/login?${params.toString()}`)
              }}
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Log in here
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

