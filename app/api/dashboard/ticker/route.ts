/**
 * Vercel-incident follow-up — the "smallest safe architectural change"
 * identified for isolating the six public `[slug]` project routes from the
 * shared `app/dashboard/layout.tsx` chrome: `getLiveTicker()` used to be
 * called SERVER-SIDE, inside that layout, on every single `/dashboard/*`
 * navigation. Because it goes through `fetchJson()`'s `cache: "no-store"`
 * (`lib/providers/common/utilities.ts`), that one call alone was enough to
 * force EVERY route under `/dashboard/*` — not just the six project
 * routes — into fully dynamic, per-request rendering, regardless of any
 * `revalidate`/`unstable_cache` work done on an individual page.
 *
 * The ticker (`LiveStatusBarAsync`) is a `"use client"` widget with its own
 * loading skeleton — nothing about it actually requires the data to be
 * present in the server-rendered HTML. Moving the fetch here, behind a
 * plain Route Handler the client calls after mount, keeps the exact same
 * data (same `getLiveTicker()`, same freshness — this route is
 * intentionally left uncached/dynamic, matching its previous
 * per-request-fresh behavior exactly) while removing it from every
 * dashboard page's own server render entirely. A Route Handler's own
 * caching is independent of any page's dynamic-rendering classification —
 * calling `getLiveTicker()` here cannot force any *page* route dynamic.
 *
 * Public, read-only, non-personalized data — no cookies/headers/session
 * read here, matching the same constraint already verified for the six
 * project routes themselves.
 *
 * Security/cache-safety audit follow-up — this endpoint originally shipped
 * with NO caching and NO rate limiting. Since it's a bare, unauthenticated
 * JSON GET with no page-render overhead around it, it's a genuinely easier
 * target to hammer in a tight loop than the `/dashboard/*` page it replaced
 * (no HTML/JS/hydration cost gating access to it) — exactly the same class
 * of crawler-amplification risk this whole task exists to close, just on a
 * new surface. `revalidate` makes Next cache the response itself (a GET
 * Route Handler is cacheable the same way a page is, under this app's
 * current non-Cache-Components model), so repeat hits within the window
 * are served from cache with zero re-invocation — not just data-layer
 * reuse. 60s (not 300s, unlike the project routes) — this is a live price/
 * gas ticker, and a shorter window keeps it feeling live while still
 * capping repeat-hit cost to once a minute regardless of request volume.
 */

import { NextResponse } from "next/server";

import { getLiveTicker } from "@/lib/data/aggregate";

export const revalidate = 60;
// A GET Route Handler needs this explicitly — unlike a page, `revalidate`
// alone doesn't cache it under this app's current (non-Cache-Components)
// model; confirmed via a real runtime header check (no Cache-Control at
// all without this) before landing it.
export const dynamic = "force-static";

export async function GET() {
  const ticker = await getLiveTicker();
  return NextResponse.json(ticker);
}
