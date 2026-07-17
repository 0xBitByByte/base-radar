/**
 * The only file in `lib/watchlist/` that talks to `localStorage` directly —
 * `service.ts` owns the in-memory cache/business logic and never touches
 * `window.localStorage` itself, so swapping this module for a real API
 * client later (fetch + a server-side store) is the only change needed;
 * `service.ts`'s public API and every UI component built on it stay
 * unchanged.
 */

import { WATCHLIST_STORAGE_KEY, WATCHLIST_VERSION } from "@/lib/watchlist/constants";
import type { Watchlist } from "@/lib/watchlist/types";

const EMPTY_WATCHLIST: Watchlist = { version: WATCHLIST_VERSION, items: [] };

function isValidWatchlist(value: unknown): value is Watchlist {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Watchlist>;
  return (
    candidate.version === WATCHLIST_VERSION &&
    Array.isArray(candidate.items) &&
    candidate.items.every(
      (item) => typeof item === "object" && item !== null && typeof item.projectId === "string" && typeof item.addedAt === "string"
    )
  );
}

/** SSR-safe (`window` doesn't exist server-side) and resilient to a corrupted/foreign value under this key — either case falls back to an empty watchlist rather than throwing. */
export function readWatchlist(): Watchlist {
  if (typeof window === "undefined") return EMPTY_WATCHLIST;

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WATCHLIST;
    const parsed = JSON.parse(raw);
    return isValidWatchlist(parsed) ? parsed : EMPTY_WATCHLIST;
  } catch {
    return EMPTY_WATCHLIST;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case `service.ts`'s in-memory cache is still correct for the rest of this tab's session even though it won't survive a refresh. */
export function writeWatchlist(watchlist: Watchlist): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}
