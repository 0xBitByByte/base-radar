import type { ReactNode } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

/**
 * Vercel-incident follow-up (fair-use suspension root-caused to crawler
 * traffic on the six public `[slug]` project routes) — this layout used to
 * call `getLiveTicker()`/`getLiveProjects()` directly, server-side, here.
 * Both go through `fetchJson()`'s `cache: "no-store"`
 * (`lib/providers/common/utilities.ts`), and because this layout wraps
 * EVERY route under `/dashboard/*` (confirmed: every one of them, not just
 * the six project routes, showed as fully dynamic in the production build
 * output), that alone forced the entire `/dashboard/*` tree into
 * per-request dynamic rendering — no page-level `revalidate` or
 * `unstable_cache` could ever take effect underneath it.
 *
 * Investigated and deliberately NOT fixed by moving this data into a
 * route-group split (a separate layout subtree for the six project routes
 * vs. the rest of the dashboard) — that would mean relocating ~35 other
 * route folders with no behavior change of their own, a much larger,
 * higher-risk diff for the same outcome. Both values are already rendered
 * by `"use client"` widgets with their own loading states
 * (`LiveStatusBarAsync`; the Command Palette, which never rendered
 * server-side at all, being `next/dynamic({ ssr: false })`), so neither
 * actually needs server-rendered data — only `DashboardLayout` (client)
 * fetching them itself, right after mount, via the two small Route
 * Handlers this PR adds (`app/api/dashboard/ticker`,
 * `app/api/dashboard/live-projects`) — see that component's own doc
 * comment for why that's a plain `useState<T | null>` + `useEffect`, not
 * the previous server-fed `use()`/`<Suspense>` pattern. This layout itself
 * now performs zero data fetching and reads no cookies/headers/session —
 * it can no longer be the reason any `/dashboard/*` route is classified
 * dynamic.
 */
export default function DashboardRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}