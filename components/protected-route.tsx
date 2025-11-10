"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "recruiter" | "candidate"
  allowedRoles?: ("admin" | "recruiter" | "candidate")[] // Support both for backward compatibility
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Determine which roles are allowed
  const allowedRolesList = allowedRoles || (requiredRole ? [requiredRole] : [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }

    // Strict role checking - redirect if user doesn't have required role
    if (!isLoading && user && allowedRolesList.length > 0) {
      const userRole = user.role as "admin" | "recruiter" | "candidate"
      
      if (!allowedRolesList.includes(userRole)) {
        // STRICT: Immediately redirect based on user's actual role
        console.warn(`[Access Denied] User with role '${userRole}' attempted to access route requiring: ${allowedRolesList.join(', ')}`)
        
        if (user.role === "admin") {
          router.push("/admin/dashboard")
        } else if (user.role === "recruiter") {
          router.push("/dashboard")
        } else if (user.role === "candidate") {
          router.push("/candidate/assessments")
        } else {
          router.push("/login")
        }
        return
      }
    }
  }, [user, isLoading, router, allowedRolesList])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // STRICT: Don't render if user doesn't have required role
  if (allowedRolesList.length > 0) {
    const userRole = user.role as "admin" | "recruiter" | "candidate"
    if (!allowedRolesList.includes(userRole)) {
      return null
    }
  }

  return <>{children}</>
}
