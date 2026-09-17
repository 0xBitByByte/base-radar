/**
 * PR-110 (API Budget & Provider Observability) — the one real read
 * surface for the in-memory provider telemetry `lib/providers/common/
 * telemetry.ts` now collects. Gated exactly like every other Admin
 * Dashboard route (`resolveAdminAccess` — see `app/api/admin/overview/
 * route.ts`'s own doc comment for the shape/guarantees this reuses
 * unchanged): a Guest or a signed-in-but-non-admin account never receives
 * a real value, not even inside an error payload.
 *
 * Deliberately does NOT read SQLite (PR-108.1/108.2's stateless-Vercel
 * doctrine): the telemetry itself is pure in-memory, so this route works
 * identically on Vercel and Fly. `resolveAdminAccess` itself still needs
 * a real account/role lookup to decide who may read this endpoint — that
 * dependency is inherited unchanged from every existing admin route (see
 * that function's own doc comment), not something this PR introduces or
 * widens; an authenticated admin session on a stateless Vercel deployment
 * with no persistent SQLite already fails the same way here as it does
 * on every other `/api/admin/*` route today.
 *
 * The response is explicitly `scope: "process-local"` end to end — never
 * a claim of a complete, cross-instance production total. See
 * `docs/API.md`'s "Provider Observability" section for what this can and
 * cannot answer under Vercel's multi-instance, stateless execution model.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminAccess } from "@/lib/admin/authorization";
import { getGithubRateLimitSnapshot } from "@/lib/providers/github/rateLimit";
import { getAllProviderTelemetrySnapshots } from "@/lib/providers/common/telemetry";

export async function GET(request: NextRequest) {
  const access = resolveAdminAccess(request);

  if (access.state === "unauthenticated") {
    return NextResponse.json({ error: "Sign in to view provider observability." }, { status: 401 });
  }
  if (access.state === "forbidden") {
    return NextResponse.json({ error: "You don't have access to provider observability." }, { status: 403 });
  }

  return NextResponse.json({
    scope: "process-local",
    note:
      "Every count below reflects only this one server process since its last cold start — Vercel routinely runs multiple independent processes at once (see docs/API.md's Provider Observability section), so this is never a complete, cross-instance production total.",
    providers: getAllProviderTelemetrySnapshots(),
    github: getGithubRateLimitSnapshot(),
  });
}
