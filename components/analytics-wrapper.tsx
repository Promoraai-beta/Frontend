"use client"

import { Analytics } from "@vercel/analytics/next"
import { useEffect, useState } from "react"

/**
 * Client-side Analytics wrapper that only loads Analytics on Vercel deployments
 * Prevents 404 errors in local development
 */
export function AnalyticsWrapper() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // Only load Analytics if:
    // 1. We're in production mode
    // 2. We're running on Vercel (check hostname or VERCEL env var)
    const isProduction = process.env.NODE_ENV === 'production'
    const isVercel = 
      typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com'))
    
    // For local development, never load Analytics
    // For production on Vercel, load Analytics
    setShouldLoad(isProduction && isVercel)
  }, [])

  // Don't render Analytics in local development
  if (!shouldLoad) {
    return null
  }

  return <Analytics />
}

