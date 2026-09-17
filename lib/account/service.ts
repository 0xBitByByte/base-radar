/**
 * The Account Layer's public API — framework-agnostic (no React import),
 * the same shape `lib/watchlist/service.ts` already established. Owns one
 * in-memory `cached` snapshot as the source of truth for every read; every
 * mutation updates it and notifies subscribers synchronously, so an edit
 * from the Profile dialog (or Sign Out from the Topbar) is reflected
 * everywhere in the app on the same tick.
 *
 * This PR is the account foundation only — no authentication provider, no
 * OAuth, no backend, no network request anywhere in this file. Every
 * mutator is already `async`, the same forward-looking shape
 * `lib/watchlist/service.ts` uses, so a future real backend can replace
 * `storage.ts`'s local reads/writes with real network calls without
 * changing this file's public signatures or any consumer.
 *
 * Never touches any other layer's storage — Personalization, the flat
 * Watchlist, Search/Notification/Automation preferences are all untouched
 * by every function below, including `signOut`/`deleteAccount`.
 *
 * PR-093.06 (Ongoing Cloud Sync) — the one deliberate exception to the
 * paragraph above: `updateAccount()` now also enqueues a real Sync
 * operation (via `accountSyncAdapter`/`enqueueOperation`, the exact
 * existing Sync Queue machinery) when the caller supplies the real,
 * authenticated account id — never when it doesn't, which keeps every
 * existing Guest-only caller's behavior completely unchanged. This file
 * still never imports auth state itself; `lib/hooks/useAccount.ts` is the
 * one place that knows whether the caller is authenticated and passes the
 * id through.
 */

import { buildGuestAccount, readAccount, writeAccount } from "@/lib/account/storage";
import { BIO_MAX_LENGTH, type Account, type ProfileInput, type ProfileValidationError } from "@/lib/account/types";
import { validateAccountImport } from "@/lib/account/validation";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import { enqueueOperation, performSync } from "@/lib/sync/service";

/** Re-exported so consumers only ever need `lib/account/service.ts` as the one public entry point, the same shape every other export here follows — foundation for a future "Import Account" action, not wired to any UI yet. */
export { validateAccountImport };

let cached: Account = readAccount();

// Stamp a fresh session's `lastActiveAt` once, at module load — not from
// every hook consumer's mount, so multiple components calling `useAccount()`
// never produce redundant writes for the same session.
if (typeof window !== "undefined") {
  cached = { ...cached, lastActiveAt: new Date().toISOString() };
  writeAccount(cached);
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: Account): void {
  cached = next;
  writeAccount(next);
  notify();
}

/** The current snapshot — same object reference until the next mutation, so `useSyncExternalStore` never re-renders on an unrelated call. */
export function getAccount(): Account {
  return cached;
}

/**
 * Future-ready: there is only ever one local account per browser today
 * (`knownAccounts` below is always empty), so this can never actually
 * trigger — but the comparison itself is real, not stubbed out, so a
 * future multi-account/cloud-sync backend only has to populate
 * `knownAccounts` from a real directory, not rewrite this check.
 */
function isDuplicateUsername(username: string, excludingAccountId: string): boolean {
  const knownAccounts: Pick<Account, "id" | "username">[] = [];
  return knownAccounts.some((known) => known.username === username && known.id !== excludingAccountId);
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Pure — never mutates state. Returns every validation error found, so a form can report all of them at once rather than one at a time. */
export function validateProfileInput(input: ProfileInput, currentAccountId: string): ProfileValidationError[] {
  const errors: ProfileValidationError[] = [];
  const name = input.name.trim();
  const username = input.username.trim();
  const email = input.email.trim();
  const bio = input.bio.trim();

  if (name === "") errors.push("empty-name");
  if (username === "") errors.push("empty-username");
  else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.push("invalid-username");
  if (email !== "" && !isValidEmailFormat(email)) errors.push("invalid-email");
  if (username !== "" && isDuplicateUsername(username, currentAccountId)) errors.push("duplicate-username");
  if (bio.length > BIO_MAX_LENGTH) errors.push("bio-too-long");

  return errors;
}

/**
 * Applies a validated profile edit. Callers are expected to have already
 * run `validateProfileInput` — this never re-validates, so it stays a
 * simple, honest "apply this patch" mutator like every other `update*` in
 * this app.
 *
 * `authAccountId`, when supplied, is the real, session-derived server
 * account id (`useAuthSession()`'s own `account.id` — never this file's
 * own local `cached.id`, which is a different, locally-generated value —
 * see this file's top-of-file doc comment). When present, the same
 * updated fields are also queued for real Cloud Sync via the existing
 * Sync Queue, then an immediate `performSync()` attempt is made — the
 * exact same queue/engine/connector path a manual "Retry" already uses,
 * just triggered automatically here instead of by a button.
 */
export async function updateAccount(
  patch: Partial<Pick<Account, "name" | "username" | "email" | "avatar" | "bio">>,
  authAccountId?: string
): Promise<void> {
  const next = { ...cached, ...patch, updatedAt: new Date().toISOString() };
  persist(next);

  if (authAccountId) {
    enqueueOperation(accountSyncAdapter.createOperation("update", authAccountId, next));
    void performSync();
  }
}

/**
 * PR-093.06 (Ongoing Cloud Sync) — applies a real pulled remote state
 * directly, bypassing the Sync Queue entirely. Never called for a local
 * edit — only by `lib/hooks/useCloudSyncActivation.ts`, after
 * `performPull()` has already confirmed no unsynced local change
 * conflicts with it. Deliberately does not enqueue anything: re-queuing
 * what was just pulled would create a real push/pull loop, syncing the
 * server's own state back to itself forever.
 *
 * Bug 3 (Authentication Flow) — also normalizes `isGuest` to `false`. This
 * function is only ever called from `useCloudSyncActivation()`'s
 * `status === "authenticated"` branch (see that file), so receiving any
 * remote account fields at all already proves a real, server-verified
 * session exists — there is no call path where this runs for a guest.
 * Previously this field was left untouched, so a genuinely authenticated
 * account (confirmed live via `/api/auth/session` reporting `isGuest:
 * false`) still showed "Guest account" everywhere `useAccount().account.
 * isGuest` is read (`AccountMenu`, `ProfilePage`'s Hero, etc.) — a real
 * client/server auth-state mismatch, not a cosmetic label bug.
 */
export function applyRemoteAccountFields(patch: Pick<Account, "name" | "username" | "email" | "avatar" | "bio">): void {
  persist({ ...cached, ...patch, isGuest: false, updatedAt: new Date().toISOString() });
}

/**
 * Foundation seam for a future backend: today, "creating an account"
 * means replacing the local Guest record with a new, non-guest local
 * profile — no server call, no password, no verification. A real
 * implementation would authenticate against a backend first and only then
 * populate these same fields from the server's response.
 */
export async function createAccount(input: { name: string; username: string; email: string }): Promise<void> {
  const now = new Date().toISOString();
  persist({
    ...cached,
    name: input.name,
    username: input.username,
    email: input.email.trim() === "" ? null : input.email,
    isGuest: false,
    updatedAt: now,
  });
}

/** Returns to a fresh Guest account — a new id and timestamps, never reusing the signed-out account's identity. Never touches Personalization/Watchlist/preferences storage. */
export async function signOut(): Promise<void> {
  persist(buildGuestAccount());
}

/**
 * Foundation seam for a future backend: today this is identical to
 * `signOut()` (there is nothing server-side to actually delete yet), but
 * kept as its own function since a real backend would need a distinct,
 * irreversible server call here that `signOut()` should never trigger.
 */
export async function deleteAccount(): Promise<void> {
  persist(buildGuestAccount());
}

/** Serializes the current account to a JSON string — the same local, no-network export shape `lib/personalization/importExport.ts` already established, here as the foundation for a future "download my data" flow. */
export function exportAccount(): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), account: cached }, null, 2);
}

/** Registers `listener` to be called after every mutation; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
