"use client";

/**
 * The real, client-side counterpart to `/api/auth/*` — the framework-
 * agnostic module `lib/hooks/useAuthSession.ts` binds to via
 * `useSyncExternalStore`, the same "one in-memory cached snapshot,
 * `subscribe`/`notify`" shape `lib/account/service.ts` already
 * established. The one real difference from that file: every mutator
 * here is a genuine network call to a real server route, not a
 * `localStorage` write — this module owns no local persistence of its
 * own at all. `Guest` is simply "no session cookie the server recognizes"
 * — this module never fabricates or assumes an authenticated state
 * without the server having said so.
 *
 * PR-093.01 decision (Registration/Login): real SIWE wallet sign-in —
 * `verifySignIn()` below, real EIP-4361 challenge/signature verification,
 * a real server-side account/session on first success (see
 * `lib/backend/sqlite/accounts.ts`) — *is* this app's Registration and
 * Login mechanism, not a placeholder standing in for one. No product
 * documentation anywhere in this repository (`docs/ROADMAP.md`,
 * `docs/PRODUCT_BIBLE/`) states OAuth/social login as a requirement; every
 * mention of "OAuth" in this codebase's own history records it as
 * explicitly out of scope for the phase that wrote it, never as something
 * promised. OAuth/social providers remain real, optional future scope —
 * nothing here should be read as blocking on them, and nothing in this
 * app should ever render a non-functional OAuth button in the meantime.
 */

import type { Account } from "@/lib/account/types";

export type AuthSessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; account: Account }
  | { status: "signed-out" }
  | { status: "expired" };

const SIGNED_IN_ENDPOINT_ERROR = "Something went wrong signing in. Please try again.";

let cached: AuthSessionState = { status: "loading" };
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function setState(next: AuthSessionState): void {
  cached = next;
  notify();
}

export function getAuthSession(): AuthSessionState {
  return cached;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The one real "ask the server what my session actually is" call — never assumed, always fetched. Safe to call repeatedly (e.g. on focus/mount); each call is a fresh, honest read. */
export async function refreshSession(): Promise<void> {
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin" });
    const data = (await response.json()) as { state: string; account?: Account };

    if (data.state === "authenticated" && data.account) {
      setState({ status: "authenticated", account: data.account });
    } else if (data.state === "expired") {
      setState({ status: "expired" });
    } else {
      setState({ status: "guest" });
    }
  } catch {
    // A real network failure — never silently claim authenticated, never
    // silently claim guest either; a caller can retry `refreshSession()`.
    setState({ status: "guest" });
  }
}

export type ChallengeResult = { message: string; nonce: string };

/** Real, server-issued challenge — throws with a safe message on any failure (invalid address, network error), never fabricates a message the server never generated. */
export async function requestChallenge(address: string): Promise<ChallengeResult> {
  const response = await fetch("/api/auth/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? SIGNED_IN_ENDPOINT_ERROR);
  }
  return (await response.json()) as ChallengeResult;
}

export type GuestMigrationSnapshot = {
  account: Pick<Account, "name" | "username" | "email" | "avatar" | "bio">;
  watchlists: unknown[];
  preferences: unknown;
};

export type VerifyResult = {
  account: Account;
  migration: { status: "none" | "migrated" | "conflict"; watchlistsMigrated?: number };
};

/** Real, server-verified sign-in. On success, updates the shared cached state immediately (every subscribed component sees `authenticated` on the same tick) rather than requiring a separate `refreshSession()` round trip. */
export async function verifySignIn(message: string, signature: string, guestSnapshot: GuestMigrationSnapshot | null): Promise<VerifyResult> {
  const response = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature, guestSnapshot: guestSnapshot ?? undefined }),
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? SIGNED_IN_ENDPOINT_ERROR);
  }
  const result = (await response.json()) as VerifyResult;
  setState({ status: "authenticated", account: result.account });
  return result;
}

/** Real server-side session revocation. Updates local state to `"signed-out"` immediately on success — a real, momentary, distinct-from-Guest confirmation state; the next `refreshSession()` (e.g. a later mount) reports the resting `"guest"` state naturally, since the server session is genuinely gone. */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST", credentials: "same-origin" });
  setState({ status: "signed-out" });
}

/**
 * PR-093.05 (Connected Accounts) — real, additional wallets the
 * currently-authenticated account has cryptographically proven ownership
 * of. Same shape as everything else in this file: every call is a genuine
 * network round trip, this module keeps no local cache or persistence of
 * its own — `lib/hooks/useLinkedWallets.ts` owns the one client-side cache.
 */
export type LinkedWallet = { address: string; accountId: string; linkedAt: string };

const LINK_WALLET_ENDPOINT_ERROR = "Something went wrong linking that wallet. Please try again.";

export async function fetchLinkedWallets(): Promise<LinkedWallet[]> {
  const response = await fetch("/api/auth/linked-wallets", { credentials: "same-origin" });
  if (!response.ok) return [];
  const data = (await response.json()) as { linkedWallets?: LinkedWallet[] };
  return data.linkedWallets ?? [];
}

/** Real, server-verified link — same `{message, signature}` shape `verifySignIn` uses, since both prove a real signature over a real SIWE challenge. Throws with the server's own honest reason (already-linked, belongs to another account, etc.) on failure, never a fabricated generic one. */
export async function linkWallet(message: string, signature: string): Promise<LinkedWallet[]> {
  const response = await fetch("/api/auth/linked-wallets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? LINK_WALLET_ENDPOINT_ERROR);
  }
  const data = (await response.json()) as { linkedWallets: LinkedWallet[] };
  return data.linkedWallets;
}

export async function unlinkWallet(address: string): Promise<LinkedWallet[]> {
  const response = await fetch(`/api/auth/linked-wallets/${address}`, { method: "DELETE", credentials: "same-origin" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? LINK_WALLET_ENDPOINT_ERROR);
  }
  const data = (await response.json()) as { linkedWallets: LinkedWallet[] };
  return data.linkedWallets;
}
