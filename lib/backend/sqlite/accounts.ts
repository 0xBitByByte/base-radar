/**
 * Real account persistence against the Phase C `users`/`accounts` schema —
 * the "minimum real AccountService functionality required by
 * authentication" Phase D asks for. Deliberately **not** shaped as the
 * zero-parameter `lib/backend/services/account.ts` contract
 * (`getAccount(): Promise<Account>`, with no id) — that contract only
 * ever made sense for a single-account-per-browser world; a real,
 * multi-user backend needs to know *which* account for every call, which
 * a bare `getAccount()` structurally cannot express. Rather than bending
 * `AccountService` to take a parameter it was never designed for (a
 * concrete incompatibility, but not one that requires changing the
 * contract itself — see the Phase D report's Contract Readiness note),
 * every function here takes an explicit account/user identifier, and
 * `sqliteBackend`'s existing `AccountService`/`SyncService` stay exactly
 * as Phase C left them (honest not-yet-implemented stubs) — nothing calls
 * `activeBackend()` for authenticated flows; the new `/api/auth/*` routes
 * call these functions directly, scoped by the real session they resolve
 * per request.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import type { Account } from "@/lib/account/types";

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  username: string;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  active_watchlist_id: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string;
};

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActiveAt: row.last_active_at,
    // A row in `accounts` only ever exists for a real, authenticated
    // identity (see `createAccountForAddress` — Guest accounts never get
    // a `users`/`accounts` row at all) — always `false`, never derived
    // from anything that could be wrong.
    isGuest: false,
  };
}

function usernameExists(db: DatabaseSync, username: string): boolean {
  const row = db.prepare("SELECT 1 FROM accounts WHERE username = ?").get(username);
  return row !== undefined;
}

/** A real, collision-free username — tries the requested one first (e.g. a migrated Guest's own username), falling back to an address-derived default, then a numbered suffix, rather than letting a real UNIQUE-constraint failure abort account creation over a cosmetic collision. */
function resolveAvailableUsername(db: DatabaseSync, requested: string, address: string): string {
  const candidates = [requested, `wallet_${address.slice(2, 8)}`];
  for (const candidate of candidates) {
    if (candidate.trim() !== "" && !usernameExists(db, candidate)) return candidate;
  }
  let suffix = 2;
  const base = `wallet_${address.slice(2, 8)}`;
  while (usernameExists(db, `${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

/** `null` when this address has never signed in before — the caller's signal to run first-time account creation, not an error. */
export function findAccountByAddress(db: DatabaseSync, address: string): Account | null {
  const row = db
    .prepare(
      `SELECT a.* FROM accounts a JOIN users u ON u.id = a.user_id WHERE u.id = ?`
    )
    .get(address.toLowerCase()) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

export function getAccountById(db: DatabaseSync, accountId: string): Account | null {
  const row = db.prepare("SELECT * FROM accounts WHERE id = ?").get(accountId) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

/** PR-095.06 (Roles & Permissions) — every real account, oldest first. Small, bounded, admin-only read (the Role Management surface's own list of real accounts to assign a role to) — the same "no index needed at this real scale" reasoning the rest of this backend already applies. */
export function listAccounts(db: DatabaseSync): Account[] {
  const rows = db.prepare("SELECT * FROM accounts ORDER BY created_at ASC").all() as AccountRow[];
  return rows.map(rowToAccount);
}

export type ProfileSeed = { name?: string; username?: string; email?: string | null; avatar?: string | null; bio?: string | null };

/**
 * The real identity anchor: `users.id` is the lowercased wallet address
 * itself — a SIWE-verified address *is* the identity, not a separate
 * generated id pointing at one. Creates both the `users` row (if this is
 * genuinely the address's first-ever sign-in — `INSERT OR IGNORE`, so a
 * concurrent double-call is safe) and the `accounts` row together, so an
 * address can never end up with a `users` row and no `accounts` row.
 */
export function createAccountForAddress(db: DatabaseSync, address: string, profile: ProfileSeed = {}): Account {
  const normalizedAddress = address.toLowerCase();
  const now = new Date().toISOString();

  db.prepare("INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)").run(normalizedAddress, now, now);

  const accountId = randomUUID();
  const requestedUsername = (profile.username ?? "").trim();
  const fallbackUsername = requestedUsername === "" ? `wallet_${normalizedAddress.slice(2, 8)}` : requestedUsername;
  const username = resolveAvailableUsername(db, fallbackUsername, normalizedAddress);
  const name = (profile.name ?? "").trim() || `Wallet ${normalizedAddress.slice(2, 6)}…${normalizedAddress.slice(-4)}`;

  db.prepare(
    `INSERT INTO accounts (id, user_id, name, username, email, avatar, bio, active_watchlist_id, created_at, updated_at, last_active_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`
  ).run(accountId, normalizedAddress, name, username, profile.email ?? null, profile.avatar ?? null, profile.bio ?? null, now, now, now);

  return getAccountById(db, accountId)!;
}

export function touchAccountLastActive(db: DatabaseSync, accountId: string): void {
  db.prepare("UPDATE accounts SET last_active_at = ? WHERE id = ?").run(new Date().toISOString(), accountId);
}

/**
 * PR-095.01 — the real underlying identity address for an account:
 * `accounts.user_id`, which is itself `users.id`, the lowercased
 * SIWE-verified wallet address this account was created for (see this
 * file's own top comment). Deliberately not exposed on the public
 * `Account` type returned elsewhere in this file — this is a server-only
 * lookup for a server-only purpose (today: checking the real admin
 * allowlist in `lib/admin/authorization.ts`), not something any existing
 * client-facing route returns.
 */
export function getAddressForAccount(db: DatabaseSync, accountId: string): string | null {
  const row = db.prepare("SELECT user_id FROM accounts WHERE id = ?").get(accountId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}
