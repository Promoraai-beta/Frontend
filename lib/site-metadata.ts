/** Production URL for canonical tags, Open Graph, and sitemap (override in env). */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://promoraai.com"
  )
}

export const SITE_TITLE =
  "Promora — See exactly how your next hire works with AI."

export const SITE_DESCRIPTION =
  "Promora AI measures how candidates use AI tools across coding, writing, and analysis—not just final output. PromptIQ scores AI collaboration for hiring teams."
