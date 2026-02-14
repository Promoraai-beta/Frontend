import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import { ConsoleFilter } from "@/components/console-filter"
// Import console filter early to catch messages before React loads
import "@/lib/console-filter-inline"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "Promora AI - AI-powered assessment evaluating platform",
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
    <html lang="en" suppressHydrationWarning className={dmSerif.variable}>
      <body className={`${geist.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ConsoleFilter />
          <AuthProvider>{children}</AuthProvider>
          {/* Analytics only loads on Vercel production deployments, not in local dev */}
          <AnalyticsWrapper />
        </ThemeProvider>
      </body>
    </html>
  )
}
