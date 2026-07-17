/**
 * The only file in `lib/alerts/` that talks to `localStorage` directly —
 * mirrors `lib/watchlist/storage.ts` exactly. `service.ts` owns the
 * in-memory cache/business logic and never touches `window.localStorage`
 * itself, so a future PR swapping this for a real per-user store (a
 * server-backed read-state sync) only has to change this one file.
 */

import { ALERTS_STORAGE_KEY, ALERTS_VERSION } from "@/lib/alerts/constants";
import type { AlertOverlay, AlertsState } from "@/lib/alerts/types";

const EMPTY_STATE: AlertsState = { version: ALERTS_VERSION, overlay: {} };

function isValidOverlay(value: unknown): value is AlertOverlay {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.read === undefined || typeof candidate.read === "boolean") &&
    (candidate.pinned === undefined || typeof candidate.pinned === "boolean") &&
    (candidate.dismissed === undefined || typeof candidate.dismissed === "boolean")
  );
}

function isValidState(value: unknown): value is AlertsState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AlertsState>;
  return (
    candidate.version === ALERTS_VERSION &&
    typeof candidate.overlay === "object" &&
    candidate.overlay !== null &&
    Object.values(candidate.overlay).every(isValidOverlay)
  );
}

/** SSR-safe (`window` doesn't exist server-side) and resilient to a corrupted/foreign value under this key — either case falls back to an empty overlay rather than throwing. */
export function readAlertsState(): AlertsState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case `service.ts`'s in-memory cache is still correct for the rest of this tab's session even though it won't survive a refresh. */
export function writeAlertsState(state: AlertsState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}
