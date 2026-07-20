/**
 * The only file in `lib/account/` that talks to `localStorage` directly —
 * `service.ts` owns the in-memory cache/business logic and never touches
 * `window.localStorage` itself, the same split `lib/watchlist/storage.ts`
 * + `lib/watchlist/service.ts` already established. Swapping this module
 * for a real API client later (fetch + a server-side account store) is
 * the only change needed; `service.ts`'s public API and every UI
 * component built on it stay unchanged.
 */

import { CURRENT_ACCOUNT_VERSION, migrateAccountRecord } from "@/lib/account/migration";
import type { Account } from "@/lib/account/types";

/** Exported so `lib/sync/diagnostics.ts` can read this key's raw value for storage-health reporting without duplicating the string literal. */
export const ACCOUNT_STORAGE_KEY = "base-radar:account";
const ACCOUNT_VERSION = CURRENT_ACCOUNT_VERSION;

type PersistedAccount = {
  version: number;
  account: Partial<Account>;
};

function generateId(): string {
  return `account:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Created automatically on first launch — a real account record (unlike, say, Personalization's fixed-timestamp default watchlists), since "first ever launch" is itself a genuine moment in time worth recording accurately. */
export function buildGuestAccount(): Account {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: "Guest User",
    username: "guest",
    email: null,
    avatar: null,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    isGuest: true,
  };
}

/**
 * Recovers whatever individual fields are present and valid on a persisted
 * record, defaulting only what's missing or invalid against a freshly
 * built guest account — the same field-by-field recovery shape
 * `lib/personalization/preferences.ts` uses, so a record from an older
 * version (missing a field this version added) or with one corrupted field
 * still keeps everything else real, rather than discarding the whole
 * account over one bad field. Never deletes or touches any other layer's
 * storage (Personalization, Watchlist, preferences, etc.) — this file only
 * ever reads/writes `base-radar:account`.
 */
function sanitizeAccount(value: unknown, fallback: Account): Account {
  if (typeof value !== "object" || value === null) return fallback;
  const candidate = value as Partial<Record<keyof Account, unknown>>;
  const sanitized: Account = { ...fallback };

  if (typeof candidate.id === "string" && candidate.id.trim() !== "") sanitized.id = candidate.id;
  if (typeof candidate.name === "string" && candidate.name.trim() !== "") sanitized.name = candidate.name;
  if (typeof candidate.username === "string" && candidate.username.trim() !== "") sanitized.username = candidate.username;
  if (typeof candidate.email === "string" || candidate.email === null) sanitized.email = candidate.email as string | null;
  if (typeof candidate.avatar === "string" || candidate.avatar === null) sanitized.avatar = candidate.avatar as string | null;
  if (typeof candidate.createdAt === "string" && !Number.isNaN(Date.parse(candidate.createdAt))) {
    sanitized.createdAt = candidate.createdAt;
  }
  if (typeof candidate.updatedAt === "string" && !Number.isNaN(Date.parse(candidate.updatedAt))) {
    sanitized.updatedAt = candidate.updatedAt;
  }
  if (typeof candidate.lastActiveAt === "string" && !Number.isNaN(Date.parse(candidate.lastActiveAt))) {
    sanitized.lastActiveAt = candidate.lastActiveAt;
  }
  if (typeof candidate.isGuest === "boolean") sanitized.isGuest = candidate.isGuest;

  return sanitized;
}

/** SSR-safe (`window` doesn't exist server-side) and resilient to missing, corrupted, or older-version data — every failure mode falls back to a fresh Guest account rather than throwing. */
export function readAccount(): Account {
  const guest = buildGuestAccount();
  if (typeof window === "undefined") return guest;

  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return guest;
    const parsed = JSON.parse(raw) as Partial<PersistedAccount> | null;
    if (typeof parsed !== "object" || parsed === null) return guest;
    const migrated = migrateAccountRecord(parsed.version, (parsed.account ?? {}) as Record<string, unknown>);
    return sanitizeAccount(migrated.value, guest);
  } catch {
    return guest;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing); `service.ts`'s in-memory cache stays correct for the rest of this tab's session even if it won't survive a refresh. */
export function writeAccount(account: Account): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ version: ACCOUNT_VERSION, account }));
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}
