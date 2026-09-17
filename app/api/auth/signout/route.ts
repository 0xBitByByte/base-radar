/**
 * Explicit sign-out — a real, server-side session revocation
 * (`revokeSession`, `sessions.revoked_at`), not merely deleting the
 * client's cookie. A later request presenting the same (now-revoked)
 * session id, even before its `expires_at`, genuinely fails validation.
 * Safe to call with no session at all — a real no-op, not an error.
 */

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { getDb } from "@/lib/backend/sqlite/db";
import { revokeSession } from "@/lib/backend/sqlite/sessions";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    revokeSession(getDb(), sessionId);
  }

  const response = NextResponse.json({ state: "guest" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
