import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Sign in — Promora",
  description:
    "Log in or create an account to run AI-native hiring assessments on Promora.",
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
