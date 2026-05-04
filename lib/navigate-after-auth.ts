"use client"

import type { User } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/config"
import { getAuthToken } from "@/lib/api"

type AppRouter = {
  push: (href: string) => void
}

/**
 * Matches legacy `/login` and `/register` redirect behavior after successful auth.
 */
export async function navigateAfterAuth(
  user: User,
  router: AppRouter,
  params: { sessionId: string | null; variant: "login" | "signup" },
): Promise<void> {
  const { sessionId, variant } = params

  if (sessionId && user.role === "candidate") {
    try {
      const token = getAuthToken()
      const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const sessionData = await sessionResponse.json()

      if (sessionData.success && sessionData.data) {
        const assessmentType = sessionData.data.assessment?.assessmentType
        if (assessmentType === "candidate") {
          router.push(`/candidate/results/${sessionId}`)
          return
        }
        router.push("/candidate/assessments")
        return
      }
    } catch {
      // fall through to role defaults
    }
  }

  if (user.role === "admin") {
    router.push("/admin/dashboard")
    return
  }

  if (user.role === "recruiter") {
    if (user.onboardingCompleted === false) {
      router.push("/recruiter/onboarding")
    } else {
      router.push("/dashboard")
    }
    return
  }

  if (user.role === "candidate") {
    const needsOnboarding =
      variant === "signup"
        ? !user.onboardingCompleted
        : user.onboardingCompleted === false

    if (needsOnboarding) {
      router.push("/candidate/onboarding")
    } else {
      router.push("/candidate/assessments")
    }
    return
  }

  router.push("/dashboard")
}
