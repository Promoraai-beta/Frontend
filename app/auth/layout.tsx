import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: {
    absolute: "Sign in · Promora AI",
  },
  description:
    "Log in or create an account to run AI-native hiring assessments on Promora AI.",
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
