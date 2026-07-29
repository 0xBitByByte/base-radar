import type { MetadataRoute } from "next";

import { SITE_URL } from "@/constants/site";

/**
 * `/dashboard` itself and every personalized subroute (watchlists, alerts,
 * automation, brief, portfolio, notifications, timeline, settings) are
 * per-user or per-session views with no unique canonical content to index.
 * `/dashboard/projects` is the one exception — real, public, evergreen
 * project profiles worth crawling — so it's re-allowed after the broader
 * `/dashboard` disallow. Per the Robots Exclusion Protocol, the longer
 * (more specific) rule wins regardless of order, so `Allow: /dashboard/projects`
 * takes precedence over `Disallow: /dashboard` for anything under it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/dashboard/projects"],
      disallow: ["/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
