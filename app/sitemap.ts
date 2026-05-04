import type { MetadataRoute } from "next"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://promoraai.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const paths: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] =
    [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
      { path: "/landing", changeFrequency: "monthly", priority: 0.8 },
      { path: "/auth", changeFrequency: "monthly", priority: 0.7 },
    ]

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
