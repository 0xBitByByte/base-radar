/**
 * Release 1 Phase C's minimum real server boundary — the first `app/api/`
 * route this codebase has ever had (confirmed zero existed before this
 * phase). Deliberately narrow: GET-only, no request body, no query
 * parameters, no account/session data of any kind — a health check is the
 * one server endpoint every real backend needs regardless of whether
 * authentication exists yet, and it's the one class of endpoint that
 * carries no mutation risk and reveals nothing sensitive, so it's safe to
 * expose before Phase D's real authentication exists. `StorageService`
 * itself is deliberately NOT exposed through any route here — mutating
 * arbitrary keys with no identity to scope them to would be exactly the
 * "unauthenticated account mutation endpoint" this phase is told not to
 * create; it stays a server-only module other server code can call
 * directly (Server Actions, Server Components), not a public HTTP surface.
 *
 * Calls `sqliteBackend` directly rather than `activeBackend()` — this
 * route exists to prove Phase C's real backend genuinely works end to
 * end, independent of the registry's separate "which backend is active"
 * question (still `localBackend`, unchanged by this phase).
 */

import { NextResponse } from "next/server";

import { sqliteBackend } from "@/lib/backend/sqlite";

export async function GET() {
  const health = await sqliteBackend.services.health.check();
  return NextResponse.json(health, { status: health.healthy ? 200 : 503 });
}
