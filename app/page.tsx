import type { Metadata } from "next"
import { Nav } from "@/components/landing/nav"
import { Hero } from "@/components/landing/hero"
import { Problem } from "@/components/landing/problem"
import { Stats } from "@/components/landing/stats"
import { HowItWorks } from "@/components/landing/how-it-works"
import { PromptIQScore } from "@/components/landing/promptiq-score"
import { WhatYouSee } from "@/components/landing/what-you-see"
import { Compare } from "@/components/landing/compare"
import { Pricing } from "@/components/landing/pricing"
import { FAQ } from "@/components/landing/faq"
import { ClosingCTA } from "@/components/landing/closing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { getSiteUrl, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site-metadata"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Problem />
      <Stats />
      <HowItWorks />
      <PromptIQScore />
      <WhatYouSee />
      <Compare />
      <Pricing />
      <FAQ />
      <ClosingCTA />
      <LandingFooter />
    </main>
  )
}
