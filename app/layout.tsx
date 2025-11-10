import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import { ConsoleFilter } from "@/components/console-filter"
// Import console filter early to catch messages before React loads
import "@/lib/console-filter-inline"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PromoraAI - AI-Powered Assessment Platform",
  description: "Track candidate assessments with AI-powered compliance monitoring",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased`}>
        <ConsoleFilter />
        <AuthProvider>{children}</AuthProvider>
        {/* Analytics only loads on Vercel production deployments, not in local dev */}
        <AnalyticsWrapper />
      </body>
    </html>
  )
}
