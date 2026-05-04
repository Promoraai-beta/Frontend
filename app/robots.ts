import type { MetadataRoute } from "next"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://promoraai.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/admin/",
        "/invite/",
        "/assessment/",
        "/test-assessment",
        "/test-assessment-azure",
        "/test-container",
        "/test-ide",
        "/test-logs",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl.replace(/^https:\/\//, ""),
  }
}
