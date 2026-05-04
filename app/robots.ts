import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-metadata"

const siteUrl = getSiteUrl()

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
