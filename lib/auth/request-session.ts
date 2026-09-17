/**
 * The one real "which account is this request from" primitive — the
 * minimum protected server boundary Phase D introduces. Every
 * authentication-sensitive route resolves the caller through this
 * function rather than trusting anything the client claims (a body field,
 * a query parameter, a bare wallet address) — the session cookie is the
 * only accepted proof, and it's validated server-side against the real
 * `sessions` table on every call, never just decoded/trusted.
 */

import type { NextRequest } from "next/server";

import { getAccountById, touchAccountLastActive } from "@/lib/backend/sqlite/accounts";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { getDb } from "@/lib/backend/sqlite/db";
import { validateSession } from "@/lib/backend/sqlite/sessions";
import type { Account } from "@/lib/account/types";

export type RequestSessionResult =
  | { state: "authenticated"; account: Account }
  | { state: "expired" }
  | { state: "guest" };

/**
 * Reads the real session cookie (never a header/body the client could
 * forge) and resolves it against the real `sessions` table. `"expired"`
 * is only ever returned when a session id was genuinely present and
 * genuinely expired — never conflated with "no session at all" (`"guest"`),
 * matching the Session Lifecycle design's distinct `Expired` state.
 */
export function resolveRequestSession(request: NextRequest): RequestSessionResult {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return { state: "guest" };

  const db = getDb();
  const result = validateSession(db, sessionId);

  if (result.state === "expired") return { state: "expired" };
  if (result.state === "invalid") return { state: "guest" };

  const account = getAccountById(db, result.accountId);
  // A session pointing at an account that no longer exists is a genuine
  // data-integrity edge case (never expected in normal operation), not a
  // silent success — treated the same as no session at all.
  if (!account) return { state: "guest" };

  touchAccountLastActive(db, result.accountId);
  return { state: "authenticated", account };
}
