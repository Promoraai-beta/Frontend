"use client"

import { API_BASE_URL } from "./config"
import { setAuthToken, getAuthToken, removeAuthToken, setAuthUser, getAuthUser } from "./api"

export interface User {
  id: string
  email: string
  name: string
  role: string
  company?: string | null
  onboardingCompleted?: boolean
}

export const AUTH_STORAGE_KEY = "recruiter_auth_user"

// Login with backend API
export async function login(email: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Login failed" }))
      throw new Error(error.error || "Login failed")
    }

    const data = await response.json()
    
    if (data.success && data.data) {
      // Store JWT token
      if (data.data.token) {
        setAuthToken(data.data.token)
      }
      
      // Store user data - need to get onboarding status from /me endpoint
      // First store basic user data
      const basicUser: User = {
        id: data.data.user?.id || data.data.id,
        email: data.data.user?.email || data.data.email || email,
        name: data.data.user?.name || data.data.name || "",
        role: data.data.user?.role || data.data.role || "recruiter",
        company: data.data.user?.company || data.data.company,
        onboardingCompleted: data.data.user?.onboardingCompleted || data.data.onboardingCompleted || false,
      }
      
      // Fetch full user data with onboarding status
      try {
        const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.data.token}`,
          },
        })
        
        if (meResponse.ok) {
          const meData = await meResponse.json()
          if (meData.success && meData.data) {
            const user: User = {
              id: meData.data.id,
              email: meData.data.email,
              name: meData.data.name,
              role: meData.data.role,
              company: meData.data.company || null,
              onboardingCompleted: meData.data.onboardingCompleted || false,
            }
            setAuthUser(user)
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
            return user
          }
        }
      } catch (meError) {
        console.warn("Failed to fetch user details, using basic user data:", meError)
      }
      
      // Fallback to basic user data if /me fails
      setAuthUser(basicUser)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(basicUser))
      return basicUser
    }

    return null
  } catch (error: any) {
    console.error("Login error:", error)
    throw error
  }
}

// Register with backend API (CANDIDATES ONLY)
export async function register(
  email: string,
  password: string,
  name: string,
  company?: string,
  role: string = "candidate" // Default to candidate for public registration
): Promise<User> {
  try {
    // Only allow candidate registration publicly
    if (role !== "candidate") {
      throw new Error("Recruiter registration is invitation-only. Please use an invitation link.")
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name, role: "candidate" }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Registration failed" }))
      throw new Error(error.error || "Registration failed")
    }

    const data = await response.json()
    
    if (data.success && data.data) {
      // Store JWT token
      if (data.data.token) {
        setAuthToken(data.data.token)
      }
      
      // Store user data
      const user: User = {
        id: data.data.user?.id || data.data.id,
        email: data.data.user?.email || data.data.email || email,
        name: data.data.user?.name || data.data.name || name,
        role: data.data.user?.role || data.data.role || "candidate",
        company: data.data.user?.company || data.data.company,
      }
      
      setAuthUser(user)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      return user
    }

    throw new Error("Registration failed")
  } catch (error: any) {
    console.error("Registration error:", error)
    throw error
  }
}

// Logout - clear token and user data
export function logout(): void {
  removeAuthToken()
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

// Get current user from storage
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  // Try to get from API helper first (has token)
  const apiUser = getAuthUser()
  if (apiUser) return apiUser

  // Fallback to localStorage
  const userData = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!userData) return null

  try {
    return JSON.parse(userData)
  } catch {
    return null
  }
}

// Check if user is authenticated (has token)
export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getCurrentUser() !== null
}

// Verify token with backend
export async function verifyToken(): Promise<User | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Token invalid or expired, clear it silently
      if (response.status === 401 || response.status === 403) {
        removeAuthToken()
        return null
      }
      // For other errors, don't clear token (might be network issue)
      console.warn("Token verification failed:", response.status, response.statusText)
      return null
    }

    const data = await response.json()
    if (data.success && data.data) {
      const user: User = {
        id: data.data.id,
        email: data.data.email,
        name: data.data.name,
        role: data.data.role,
        company: data.data.company || null,
        onboardingCompleted: data.data.onboardingCompleted,
      }
      setAuthUser(user)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      return user
    }

    return null
  } catch (error: any) {
    // Network error or backend not available - don't clear token, just return null
    // This allows the app to continue with cached user data if backend is temporarily unavailable
    if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      console.warn("Backend unavailable for token verification, using cached user data")
      return null // Return null but don't clear token - let user continue with cached data
    }
    console.error("Token verification error:", error)
    return null
  }
}
