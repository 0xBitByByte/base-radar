/**
 * PR-093.06 (Ongoing Cloud Sync) — real pull, originally for the
 * `account` entity only; PR-094.01 extends this same route to also
 * return `search` entity state — `sqliteBackend.services.sync.pull()`
 * now returns every entity this account has real cloud state for in one
 * response, so `performPull()`'s existing, entity-agnostic reconciliation
 * loop needs no changes at all to handle both. Same session boundary as
 * `/api/sync/push` — the real, current cloud state for whichever account
 * the session resolves to, never a client-requested one.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveRequestSession } from "@/lib/auth/request-session";
import { sqliteBackend } from "@/lib/backend/sqlite";

export async function GET(request: NextRequest) {
  const session = resolveRequestSession(request);
  if (session.state !== "authenticated") {
    return NextResponse.json({ error: "Sign in to sync." }, { status: 401 });
  }

  const result = await sqliteBackend.services.sync.pull(session.account.id);
  return NextResponse.json(result);
}
