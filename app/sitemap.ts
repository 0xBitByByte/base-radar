import type { MetadataRoute } from "next";

import { getProjects } from "@/data/projects/helpers";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { SITE_URL } from "@/constants/site";

/**
 * Public, evergreen routes only — `/dashboard` and its personalized
 * subroutes (watchlists, alerts, automation, brief, portfolio,
 * notifications, timeline, settings) are per-user views excluded here and
 * in `app/robots.ts` for the same reason: no unique canonical content to
 * index. `/dashboard/watchlist` is a permanent redirect, not a real page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/dashboard/projects`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  const curatedViewRoutes: MetadataRoute.Sitemap = Object.values(PROJECTS_VIEW_META).map((meta) => ({
    url: `${SITE_URL}/dashboard/projects/${meta.slug}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: 0.6,
  }));

  const projectRoutes: MetadataRoute.Sitemap = getProjects().map((project) => ({
    url: `${SITE_URL}/dashboard/projects/${project.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...curatedViewRoutes, ...projectRoutes];
}
