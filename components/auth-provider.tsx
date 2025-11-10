"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, getCurrentUser, verifyToken } from "@/lib/auth"

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is in localStorage first (fast)
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setIsLoading(false)
      
      // Then verify token with backend (async) - don't block UI on failure
      verifyToken()
        .then(verifiedUser => {
          if (verifiedUser) {
            setUser(verifiedUser)
          }
          // If verification fails, keep current user (might be network issue)
          // Protected routes will handle authentication on their own
        })
        .catch((error) => {
          // Silently handle errors - network issues shouldn't break the app
          console.warn("Token verification failed (non-blocking):", error?.message || error)
          // Keep current user - let protected routes handle authentication
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  return <AuthContext.Provider value={{ user, setUser, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
