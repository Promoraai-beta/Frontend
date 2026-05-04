import type React from "react"
import type { Metadata } from "next"
import { Inter, Fraunces, JetBrains_Mono, Space_Mono } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import { ConsoleFilter } from "@/components/console-filter"
import "@/lib/console-filter-inline"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "Promora — Evaluate How Candidates work with AI",
  description:
    "See exactly how every candidate works with AI before you make a call. Promora measures AI collaboration — not just whether the code compiles.",
  icons: {
    icon: "/Promora-Logo.svg",
    shortcut: "/Promora-Logo.svg",
    apple: "/Promora-Logo.svg",
  },
  openGraph: {
    title: "Promora — Evaluate How Candidates work with AI",
    description:
      "See exactly how every candidate works with AI before you make a call.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Promora — Evaluate How Candidates work with AI",
    description:
      "See exactly how every candidate works with AI before you make a call.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${spaceMono.variable}`}
    >
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ConsoleFilter />
          <AuthProvider>{children}</AuthProvider>
          <AnalyticsWrapper />
        </ThemeProvider>
      </body>
    </html>
  )
}
