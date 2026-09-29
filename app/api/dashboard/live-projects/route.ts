/**
 * Vercel-incident follow-up — same rationale as
 * `app/api/dashboard/ticker/route.ts`, for `getLiveProjects()`. Consumed
 * only by the Command Palette's results list (via `CommandPalette.tsx`,
 * itself a `next/dynamic({ ssr: false })` component that never rendered
 * server-side in the first place) — the server layout was only ever
 * "prewarming" this data for palette responsiveness, not rendering it.
 * Moving the fetch here (triggered client-side, right after the dashboard
 * shell mounts, matching the previous prewarm timing) preserves that same
 * responsiveness without the shared layout's server render ever touching
 * this data — see `app/dashboard/layout.tsx`'s own doc comment.
 *
 * Public, read-only, non-personalized data — same constraint as the ticker
 * route above.
 *
 * Security/cache-safety audit follow-up — same finding and fix as
 * `app/api/dashboard/ticker/route.ts`: shipped with no caching, and
 * `getLiveProjects()` is one of the most expensive calls in this codebase
 * (rebuilds full `ProjectIntelligence` — GitHub, DefiLlama, CoinGecko,
 * Blockscout — for every registry project, ~1-2s on its own per its own
 * doc comment in `lib/projects/service.ts`), now directly, publicly,
 * unauthenticated-ly reachable as a bare JSON GET with none of the
 * HTML/JS/hydration overhead a `/dashboard/*` page render has. 300s,
 * matching the six project routes' own window — this data isn't
 * meaningfully more time-sensitive than theirs.
 */

import { NextResponse } from "next/server";

import { getLiveProjects } from "@/lib/projects/service";

export const revalidate = 300;
// See app/api/dashboard/ticker/route.ts for why this is required too.
export const dynamic = "force-static";

export async function GET() {
  const liveProjects = await getLiveProjects();
  return NextResponse.json(liveProjects);
}
