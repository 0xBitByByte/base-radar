/**
 * The one real "what is my current session state" read — resolves purely
 * through `resolveRequestSession()`'s real cookie + database check, never
 * anything the client claims. Distinguishes `"authenticated"`,
 * `"expired"`, and `"guest"` (the three states a session check can
 * actually be in — `"loading"` and `"signed-out"` are client-only,
 * transient states this endpoint never needs to represent). An expired
 * session's stale cookie is cleared here, so the client doesn't keep
 * sending a dead session id on every subsequent request.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveRequestSession } from "@/lib/auth/request-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";

export async function GET(request: NextRequest) {
  const result = resolveRequestSession(request);

  if (result.state === "authenticated") {
    return NextResponse.json({ state: "authenticated", account: result.account });
  }

  const response = NextResponse.json({ state: result.state });
  if (result.state === "expired") {
    response.cookies.delete(SESSION_COOKIE_NAME);
  }
  return response;
}
