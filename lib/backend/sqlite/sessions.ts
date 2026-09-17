/**
 * Real, server-side, revocable sessions — an opaque random token stored in
 * the `sessions` table (`0002_auth_sessions`), looked up on every
 * validation call. Deliberately not a stateless/self-verifying token
 * (JWT or similar): a DB-backed session is what makes sign-out an actual,
 * irreversible invalidation (`revokeSession` sets `revoked_at`, and every
 * later `validateSession` call for that id genuinely fails) rather than a
 * client discarding a still-otherwise-valid token.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/** Seven days — a real, bounded lifetime; see the Session Lifecycle section of the Phase D report for why "Expired" is a distinct state from "Signed Out" rather than being collapsed into it. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Session = {
  id: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
};

export type SessionValidation =
  | { state: "authenticated"; accountId: string }
  | { state: "expired" }
  | { state: "invalid" };

export function createSession(db: DatabaseSync, accountId: string): Session {
  const id = randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);

  db.prepare("INSERT INTO sessions (id, account_id, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, NULL)").run(
    id,
    accountId,
    createdAt.toISOString(),
    expiresAt.toISOString()
  );

  return { id, accountId, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

/**
 * Three distinct real outcomes, not a boolean: `"invalid"` covers both "no
 * such session ever existed" and "explicitly revoked" — from a caller's
 * perspective those are the same actionable state (fall back to Guest,
 * silently) — while `"expired"` is kept separate because the Session
 * Lifecycle design (Phase B) treats it as its own UI-visible state (a
 * silent, involuntary lapse the user should be told about), distinct from
 * a deliberate Sign Out.
 */
export function validateSession(db: DatabaseSync, sessionId: string): SessionValidation {
  const row = db.prepare("SELECT account_id, expires_at, revoked_at FROM sessions WHERE id = ?").get(sessionId) as
    | { account_id: string; expires_at: string; revoked_at: string | null }
    | undefined;

  if (!row || row.revoked_at !== null) return { state: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { state: "expired" };

  return { state: "authenticated", accountId: row.account_id };
}

/** Real, permanent invalidation — a revoked session's id is never valid again, even if `expires_at` is still in the future. Safe to call on an id that doesn't exist or is already revoked (a real no-op, never throws). */
export function revokeSession(db: DatabaseSync, sessionId: string): void {
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(new Date().toISOString(), sessionId);
}
