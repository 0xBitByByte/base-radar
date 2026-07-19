/**
 * The Notification Engine's runtime cache and public entry point — no
 * backend, no polling, no timers, same "pure runtime cache" rule
 * `lib/timeline/storage.ts` already follows. `cachedRawNotifications` is
 * rebuilt only when `getTimeline()` returns a genuinely new reference —
 * Timeline's own storage already guarantees a stable reference between real
 * changes, so tracking it alone is sufficient here.
 *
 * PR19 Part 2 added an in-memory read-state overlay
 * (`markNotificationRead`/`markAllNotificationsRead`), mirroring
 * `lib/alerts/service.ts`'s own overlay-over-content pattern exactly — the
 * pure `buildNotifications()` output (`engine.ts`) is never mutated
 * directly; read state is layered on top at this storage boundary, exactly
 * where `lib/alerts/service.ts` layers its own `overlayState` on top of
 * `liveAlertContent`.
 *
 * PR19 Part 3 backs that same overlay with `localStorage` — the exact
 * read/write-with-a-version-guard shape `lib/watchlist/storage.ts` already
 * uses (SSR-safe, falls back to an empty state rather than throwing on a
 * corrupted or foreign value under this key) — plus `markNotificationUnread`
 * and `clearAllReadState`, the two operations Part 2 didn't need yet.
 */

import { buildNotifications } from "@/lib/notifications/engine";
import type { Notification } from "@/lib/notifications/types";
import { getTimeline } from "@/lib/timeline/storage";
import type { Timeline } from "@/lib/timeline/types";

const NOTIFICATION_READ_STATE_STORAGE_KEY = "base-radar:notification-read-state";
const NOTIFICATION_READ_STATE_VERSION = 1;

type PersistedReadState = {
  version: number;
  /** id → the real moment it was marked read (`new Date().toISOString()`), never a fabricated or reused timestamp. */
  readAt: Record<string, string>;
};

function isValidPersistedReadState(value: unknown): value is PersistedReadState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedReadState>;
  return (
    candidate.version === NOTIFICATION_READ_STATE_VERSION &&
    typeof candidate.readAt === "object" &&
    candidate.readAt !== null &&
    Object.values(candidate.readAt).every((readAt) => typeof readAt === "string")
  );
}

let cachedSourceTimeline: Timeline | null = null;
let cachedRawNotifications: Notification[] | null = null;

const readOverlay = new Map<string, string>();
let hydrated = false;

/** SSR-safe and resilient to a corrupted/foreign value under this key — runs once per session, the first time anything actually needs the overlay. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_READ_STATE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!isValidPersistedReadState(parsed)) return;
    for (const [id, readAt] of Object.entries(parsed.readAt)) {
      readOverlay.set(id, readAt);
    }
  } catch {
    // Intentionally swallowed — a corrupted value just means starting from an empty overlay, same as `lib/watchlist/storage.ts`'s `readWatchlist`.
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case the in-memory overlay is still correct for the rest of this tab's session even though it won't survive a refresh. */
function persistReadState(): void {
  if (typeof window === "undefined") return;

  try {
    const readAt = Object.fromEntries(readOverlay);
    window.localStorage.setItem(
      NOTIFICATION_READ_STATE_STORAGE_KEY,
      JSON.stringify({ version: NOTIFICATION_READ_STATE_VERSION, readAt })
    );
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

/** Bumped on every read-state mutation so `getNotifications()` knows to recompute the overlaid view; left alone by Timeline-driven rebuilds so a stable overlay never forces a redundant recompute. */
let overlayVersion = 0;
let cachedOverlaidVersion = -1;
let cachedOverlaidNotifications: Notification[] | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Rebuilds `cachedRawNotifications` only when `getTimeline()`'s reference actually changed. */
function ensureRawNotifications(): Notification[] {
  const timeline = getTimeline();
  if (!cachedRawNotifications || cachedSourceTimeline !== timeline) {
    cachedSourceTimeline = timeline;
    cachedRawNotifications = buildNotifications(timeline);
  }
  return cachedRawNotifications;
}

function applyReadOverlay(notifications: Notification[]): Notification[] {
  if (readOverlay.size === 0) return notifications;
  return notifications.map((notification) => {
    const readAt = readOverlay.get(notification.id);
    return readAt ? { ...notification, isRead: true, readAt } : notification;
  });
}

/** The one public entry point — reuses `getTimeline()`; never touches a provider or rebuilds any upstream engine. Same reference returned until either the underlying Timeline or the read-state overlay actually changes. */
export function getNotifications(): Notification[] {
  ensureHydrated();
  const raw = ensureRawNotifications();
  if (!cachedOverlaidNotifications || cachedOverlaidVersion !== overlayVersion) {
    cachedOverlaidNotifications = applyReadOverlay(raw);
    cachedOverlaidVersion = overlayVersion;
  }
  return cachedOverlaidNotifications;
}

export function markNotificationRead(id: string): void {
  ensureHydrated();
  if (readOverlay.has(id)) return;
  readOverlay.set(id, new Date().toISOString());
  overlayVersion += 1;
  persistReadState();
  notify();
}

/** The inverse of `markNotificationRead` — removes `id` from the overlay entirely, so it reverts to whatever `isRead`/`readAt` `buildNotifications()` itself produced (always `false`/`null`, since the engine never marks anything read on its own). */
export function markNotificationUnread(id: string): void {
  ensureHydrated();
  if (!readOverlay.has(id)) return;
  readOverlay.delete(id);
  overlayVersion += 1;
  persistReadState();
  notify();
}

/** Marks every currently-built notification read — Notifications carry no Watchlist-mute concept of their own (unlike `lib/alerts/service.ts`'s `markAllRead`, which deliberately excludes muted projects), so "all" genuinely means all. */
export function markAllNotificationsRead(): void {
  ensureHydrated();
  const raw = ensureRawNotifications();
  const now = new Date().toISOString();
  let changed = false;
  for (const notification of raw) {
    if (!readOverlay.has(notification.id)) {
      readOverlay.set(notification.id, now);
      changed = true;
    }
  }
  if (changed) {
    overlayVersion += 1;
    persistReadState();
    notify();
  }
}

/** Forgets every read marker — every notification reverts to unread. A deliberate reset action (exposed on the Preferences page), distinct from `markNotificationUnread` (one at a time). */
export function clearAllReadState(): void {
  ensureHydrated();
  if (readOverlay.size === 0) return;
  readOverlay.clear();
  overlayVersion += 1;
  persistReadState();
  notify();
}

/** Registers `listener` to be called after a read-state mutation — the exact shape `useSyncExternalStore` expects. Upstream Timeline changes are NOT this module's concern to notify; callers should also subscribe to `lib/alerts/service.ts`/`lib/watchlist/service.ts` for those (see `lib/hooks/useNotifications.ts`). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
