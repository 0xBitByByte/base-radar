/**
 * PR-093.04 — the Recently Viewed Projects store. Same shape every other
 * local store in this app already uses (`lib/search/storage.ts`'s Recent
 * Searches is the closest sibling): an in-memory cache, an SSR-safe
 * versioned `localStorage` envelope that falls back to an empty list on
 * any corruption rather than throwing, and a `subscribe`/`notify` pair
 * shaped for `useSyncExternalStore`.
 *
 * Local-device only — no cloud sync, no cross-device behavior, exactly
 * like the rest of the Personalization Layer.
 */

import type { RecentlyViewedEntry, RecentlyViewedState } from "@/lib/research-history/types";

const STORAGE_KEY = "base-radar:research-history";
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 20;

const DEFAULT_STATE: RecentlyViewedState = { version: STORAGE_VERSION, entries: [] };

function isValidEntry(value: unknown): value is RecentlyViewedEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecentlyViewedEntry>;
  return typeof candidate.projectId === "string" && typeof candidate.projectName === "string" && typeof candidate.projectSlug === "string" && typeof candidate.viewedAt === "string" && !Number.isNaN(Date.parse(candidate.viewedAt));
}

function isValidState(value: unknown): value is RecentlyViewedState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RecentlyViewedState>;
  return candidate.version === STORAGE_VERSION && Array.isArray(candidate.entries) && candidate.entries.every(isValidEntry);
}

let cached: RecentlyViewedState = DEFAULT_STATE;
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (isValidState(parsed)) cached = parsed;
  } catch {
    // Corrupted value — start with an honest empty list, never a fabricated one.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Best-effort — quota/private-browsing failures still leave the in-memory state correct for this tab's session.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Most-recently-viewed first — real page-visit order, never re-sorted by any other criterion. */
export function getRecentlyViewed(): RecentlyViewedEntry[] {
  ensureHydrated();
  return cached.entries;
}

/** Records a real project-page visit. Re-viewing an already-recorded project moves it to the front with a fresh `viewedAt` — never a duplicate entry for the same project. Capped at `MAX_ENTRIES`, dropping the oldest. */
export function recordProjectView(projectId: string, projectName: string, projectSlug: string): void {
  ensureHydrated();
  const entry: RecentlyViewedEntry = { projectId, projectName, projectSlug, viewedAt: new Date().toISOString() };
  const withoutExisting = cached.entries.filter((existing) => existing.projectId !== projectId);
  cached = { version: STORAGE_VERSION, entries: [entry, ...withoutExisting].slice(0, MAX_ENTRIES) };
  persist();
  notify();
}

export function clearRecentlyViewed(): void {
  ensureHydrated();
  if (cached.entries.length === 0) return;
  cached = DEFAULT_STATE;
  persist();
  notify();
}
