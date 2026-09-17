/**
 * PR-093.05 (Connected Accounts) — real, additional wallet addresses a
 * signed-in user has cryptographically proven they also control, linked to
 * their one real account. Deliberately identity-*linking* only, never a
 * second sign-in method: a linked wallet lets someone show "I also own
 * this address" on their Profile, but signing in still only ever works
 * through the account's one real primary address (`users.id` /
 * `accounts.user_id`, set once at account creation — see
 * `lib/backend/sqlite/accounts.ts`). This deliberately avoids the much
 * larger, unrelated problem of account merging (what happens when two
 * *already-registered* addresses get linked together) — every function
 * here refuses to link an address that is any account's real primary
 * wallet, its own included.
 *
 * `linked_wallets.address` is the table's real primary key
 * (`0004_linked_wallets`), so "this address already belongs to someone"
 * is a genuine database-level guarantee, not just an application check —
 * the explicit lookups below exist to return an honest, specific reason
 * before ever attempting the write, not to replace that guarantee.
 */

import type { DatabaseSync } from "node:sqlite";

export type LinkedWallet = {
  address: string;
  accountId: string;
  linkedAt: string;
};

type LinkedWalletRow = {
  address: string;
  account_id: string;
  linked_at: string;
};

function rowToLinkedWallet(row: LinkedWalletRow): LinkedWallet {
  return { address: row.address, accountId: row.account_id, linkedAt: row.linked_at };
}

/** Every real linked wallet for this account, most-recently-linked first. */
export function listLinkedWallets(db: DatabaseSync, accountId: string): LinkedWallet[] {
  const rows = db
    .prepare("SELECT * FROM linked_wallets WHERE account_id = ? ORDER BY linked_at DESC")
    .all(accountId) as LinkedWalletRow[];
  return rows.map(rowToLinkedWallet);
}

export type LinkWalletOutcome =
  | { outcome: "linked"; wallet: LinkedWallet }
  | { outcome: "is-your-own-primary-wallet" }
  | { outcome: "already-linked-to-you" }
  | { outcome: "is-another-accounts-primary-wallet" }
  | { outcome: "already-linked-to-another-account" };

/**
 * Every real refusal reason is checked and returned honestly before any
 * write is attempted — never a raw constraint-violation exception
 * surfacing as an opaque 500. The caller (`/api/auth/linked-wallets`) is
 * responsible for having already verified a real SIWE signature for
 * `address` before calling this — this function only enforces the
 * identity-integrity rules, it never itself proves ownership.
 */
export function linkWalletToAccount(db: DatabaseSync, accountId: string, address: string): LinkWalletOutcome {
  const normalizedAddress = address.toLowerCase();

  const ownAccountRow = db.prepare("SELECT user_id FROM accounts WHERE id = ?").get(accountId) as { user_id: string } | undefined;
  if (ownAccountRow?.user_id === normalizedAddress) return { outcome: "is-your-own-primary-wallet" };

  const existingLink = db.prepare("SELECT account_id FROM linked_wallets WHERE address = ?").get(normalizedAddress) as
    | { account_id: string }
    | undefined;
  if (existingLink) {
    return existingLink.account_id === accountId ? { outcome: "already-linked-to-you" } : { outcome: "already-linked-to-another-account" };
  }

  const otherPrimaryRow = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(normalizedAddress) as { id: string } | undefined;
  if (otherPrimaryRow) return { outcome: "is-another-accounts-primary-wallet" };

  const linkedAt = new Date().toISOString();
  db.prepare("INSERT INTO linked_wallets (address, account_id, linked_at) VALUES (?, ?, ?)").run(normalizedAddress, accountId, linkedAt);

  return { outcome: "linked", wallet: { address: normalizedAddress, accountId, linkedAt } };
}

export type UnlinkWalletOutcome = { outcome: "unlinked" } | { outcome: "not-found" };

/** Only ever removes a row that genuinely belongs to `accountId` — never lets one account unlink another's real linked wallet, even if it somehow guessed the address. */
export function unlinkWalletFromAccount(db: DatabaseSync, accountId: string, address: string): UnlinkWalletOutcome {
  const result = db.prepare("DELETE FROM linked_wallets WHERE address = ? AND account_id = ?").run(address.toLowerCase(), accountId);
  return result.changes > 0 ? { outcome: "unlinked" } : { outcome: "not-found" };
}
