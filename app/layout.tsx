import type React from "react"
import type { Metadata } from "next"
import { Inter, Fraunces, JetBrains_Mono, Space_Mono } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { AnalyticsWrapper } from "@/components/analytics-wrapper"
import { ConsoleFilter } from "@/components/console-filter"
import "@/lib/console-filter-inline"
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/site-metadata"
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

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s · Promora AI",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Promora AI",
  icons: {
    icon: [
      { url: "/promora-mark-black.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/Promora-Logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/promora-mark-black.svg",
    apple: "/Promora-Logo.svg",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: siteUrl,
    siteName: "Promora AI",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Promora AI",
  url: siteUrl,
  logo: `${siteUrl}/Promora-Logo.svg`,
  description: SITE_DESCRIPTION,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ConsoleFilter />
          <AuthProvider>{children}</AuthProvider>
          <AnalyticsWrapper />
        </ThemeProvider>
      </body>
    </html>
  )
}
