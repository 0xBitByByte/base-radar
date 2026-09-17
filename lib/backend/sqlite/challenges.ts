/**
 * Real, server-verifiable SIWE challenges — the piece that makes "prove
 * you control this address" actually true rather than trusting a bare
 * wallet address string. A challenge is single-use (`consumeChallenge`
 * marks it consumed and any later attempt to reuse the same nonce fails —
 * real replay prevention, not a client-side promise) and short-lived
 * (`CHALLENGE_TTL_MS`), stored in the real `auth_challenges` table
 * (`lib/backend/sqlite/migrations.ts`'s `0002_auth_sessions`).
 *
 * Nonces come from `generateSiweNonce()` (`viem/siwe`), not
 * `crypto.randomUUID()` — a real defect found while writing this phase's
 * own tests: EIP-4361 requires an alphanumeric nonce (`viem`'s own
 * `createSiweMessage` throws otherwise — confirmed live,
 * `SiweInvalidMessageFieldError: Nonce must be alphanumeric`), and a
 * UUID's hyphens fail that check. `generateSiweNonce()` is real,
 * cryptographically random, and already spec-compliant.
 */

import type { DatabaseSync } from "node:sqlite";
import { generateSiweNonce } from "viem/siwe";

/** Five minutes — long enough for a real wallet-signing prompt, short enough that a leaked/logged nonce is worthless soon after. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type Challenge = {
  nonce: string;
  address: string;
  issuedAt: string;
  expiresAt: string;
};

export type ConsumeChallengeResult =
  | { outcome: "valid"; address: string }
  | { outcome: "not-found" }
  | { outcome: "already-consumed" }
  | { outcome: "expired" }
  | { outcome: "address-mismatch" };

/** A real, cryptographically random nonce (`randomUUID`, Node's own built-in — no new dependency) — never a predictable or sequential value. */
export function createChallenge(db: DatabaseSync, address: string): Challenge {
  const nonce = generateSiweNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
  const normalizedAddress = address.toLowerCase();

  db.prepare("INSERT INTO auth_challenges (nonce, address, issued_at, expires_at, consumed_at) VALUES (?, ?, ?, ?, NULL)").run(
    nonce,
    normalizedAddress,
    issuedAt.toISOString(),
    expiresAt.toISOString()
  );

  return { nonce, address: normalizedAddress, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

/**
 * Real, one-shot consumption — a nonce that doesn't exist, was already
 * consumed, has expired, or was issued for a different address than the
 * one attempting to use it all honestly fail, each with its own distinct
 * reason (so the verify route can report the real cause, not a single
 * opaque failure). Marking `consumed_at` happens as part of the same
 * validation read-then-write, so a genuinely concurrent double-use of the
 * same nonce can only ever succeed once — the second call finds
 * `consumed_at` already set.
 */
export function consumeChallenge(db: DatabaseSync, nonce: string, address: string): ConsumeChallengeResult {
  const row = db.prepare("SELECT address, expires_at, consumed_at FROM auth_challenges WHERE nonce = ?").get(nonce) as
    | { address: string; expires_at: string; consumed_at: string | null }
    | undefined;

  if (!row) return { outcome: "not-found" };
  if (row.consumed_at !== null) return { outcome: "already-consumed" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { outcome: "expired" };
  if (row.address !== address.toLowerCase()) return { outcome: "address-mismatch" };

  db.prepare("UPDATE auth_challenges SET consumed_at = ? WHERE nonce = ?").run(new Date().toISOString(), nonce);
  return { outcome: "valid", address: row.address };
}
