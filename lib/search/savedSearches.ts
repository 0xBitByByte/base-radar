/**
 * Saved Searches storage — PR-094.02. Deliberately a separate module, key,
 * and data shape from `lib/search/storage.ts`'s Recent Searches: Recent
 * Searches is an automatic, capped, silently-evicting log a user never
 * directly curates; a Saved Search is a real, named, explicit action a
 * user takes (a bookmark icon in the Command Palette, never triggered by
 * merely selecting a result) and can only ever change by that user's own
 * explicit save/delete action — never auto-evicted, never overwritten by
 * a later search.
 *
 * PR-094.02 Cloud Sync — a Saved Search list is structurally a multiple-
 * independent-named-records entity (the same real shape Watchlists
 * already has), so it syncs as real per-record `create`/`delete`
 * operations (`savedSearchSyncAdapter`), never collapsed into Recent
 * Searches' singleton-blob "replace the whole list" shape. `saveSearch`/
 * `deleteSavedSearch`/`deleteSavedSearchByQuery` accept an optional
 * `authAccountId`, the same real session-derived-id parameter shape
 * `lib/search/storage.ts`'s `recordSearch()` already established — only
 * enqueued when the caller supplies it, so every existing Guest-only
 * caller's behavior is completely unchanged.
 *
 * `applyRemoteSavedSearch`/`removeSavedSearchLocally` apply a real pulled
 * remote record directly, bypassing the Sync Queue entirely — the same
 * bypass-the-queue shape `applyRemoteRecentSearches()` already
 * established, so a pull can never re-trigger a push of the state it just
 * received.
 *
 * Same versioned-localStorage pattern as every other engine's storage
 * layer in this app: lazy SSR-safe hydration, graceful recovery from
 * malformed storage.
 */

import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import { enqueueOperation, performSync } from "@/lib/sync/service";

export type SavedSearch = {
  id: string;
  query: string;
  createdAt: string;
};

const SAVED_SEARCHES_STORAGE_KEY = "base-radar:search-saved";
const SAVED_SEARCHES_VERSION = 1;
/** A real, generous ceiling against unbounded growth — the same "cap exists, but curation is entirely the user's own explicit choice" shape `MAX_MAX_RECENT_SEARCHES` already establishes for Recent Searches' own preference-driven cap. */
const MAX_SAVED_SEARCHES = 50;

type PersistedSavedSearches = {
  version: number;
  searches: SavedSearch[];
};

function isValidSavedSearch(value: unknown): value is SavedSearch {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SavedSearch>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim() !== "" &&
    typeof candidate.query === "string" &&
    candidate.query.trim() !== "" &&
    typeof candidate.createdAt === "string" &&
    !Number.isNaN(Date.parse(candidate.createdAt))
  );
}

function isValidPersisted(value: unknown): value is PersistedSavedSearches {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedSavedSearches>;
  return candidate.version === SAVED_SEARCHES_VERSION && Array.isArray(candidate.searches) && candidate.searches.every(isValidSavedSearch);
}

function generateId(): string {
  return `saved-search:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

let savedSearches: SavedSearch[] = [];
let hydrated = false;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // A wholesale-invalid envelope falls back to empty; an individually
    // malformed entry inside an otherwise-valid envelope is dropped on
    // its own, the same field-by-field recovery `lib/account/storage.ts`
    // already established — one corrupted saved search should never cost
    // every other real one.
    if (typeof parsed === "object" && parsed !== null && (parsed as Partial<PersistedSavedSearches>).version === SAVED_SEARCHES_VERSION) {
      const candidate = parsed as Partial<PersistedSavedSearches>;
      savedSearches = Array.isArray(candidate.searches) ? candidate.searches.filter(isValidSavedSearch) : [];
    } else if (isValidPersisted(parsed)) {
      savedSearches = parsed.searches;
    }
  } catch {
    // Intentionally swallowed — a corrupted value just means starting empty.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify({ version: SAVED_SEARCHES_VERSION, searches: savedSearches }));
  } catch {
    // Intentionally swallowed — best-effort, same as every other storage layer here.
  }
}

const listeners = new Set<() => void>();
function notify(): void {
  for (const listener of listeners) listener();
}

/** Same reference returned until a real mutation happens — satisfies `useSyncExternalStore`. Newest first. */
export function getSavedSearches(): SavedSearch[] {
  ensureHydrated();
  return savedSearches;
}

export function isQuerySaved(query: string): boolean {
  ensureHydrated();
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return false;
  return savedSearches.some((entry) => entry.query.toLowerCase() === trimmed);
}

/**
 * Saves `query` as a real, explicit Saved Search — never called
 * automatically; only a real user action (the Command Palette's Save
 * toggle) calls this. Case-insensitively de-duplicated, the same
 * convention Recent Searches already uses — saving an already-saved
 * query is a real no-op, never a duplicate entry. Returns `null` for an
 * empty query or once `MAX_SAVED_SEARCHES` is reached, rather than
 * silently dropping the oldest entry — unlike Recent Searches, nothing
 * here is auto-evicted; the user must explicitly delete one first.
 */
export function saveSearch(query: string, authAccountId?: string): SavedSearch | null {
  ensureHydrated();
  const trimmed = query.trim();
  if (!trimmed) return null;

  const existing = savedSearches.find((entry) => entry.query.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  if (savedSearches.length >= MAX_SAVED_SEARCHES) return null;

  const entry: SavedSearch = { id: generateId(), query: trimmed, createdAt: new Date().toISOString() };
  savedSearches = [entry, ...savedSearches];
  persist();
  notify();

  if (authAccountId) {
    enqueueOperation(savedSearchSyncAdapter.createOperation("create", entry.id, entry));
    void performSync();
  }

  return entry;
}

/** Removes a real saved search by id — a genuine no-op for an id that doesn't exist, never an error. */
export function deleteSavedSearch(id: string, authAccountId?: string): void {
  ensureHydrated();
  const removed = savedSearches.find((entry) => entry.id === id);
  const next = savedSearches.filter((entry) => entry.id !== id);
  if (next.length === savedSearches.length) return;
  savedSearches = next;
  persist();
  notify();

  if (authAccountId && removed) {
    enqueueOperation(savedSearchSyncAdapter.createOperation("delete", removed.id, removed));
    void performSync();
  }
}

/** Removes a saved search by its real query text (case-insensitive) — the shape the Command Palette's Save toggle needs to "un-save" the currently-typed query without first looking up its id. */
export function deleteSavedSearchByQuery(query: string, authAccountId?: string): void {
  ensureHydrated();
  const trimmed = query.trim().toLowerCase();
  const removed = savedSearches.find((entry) => entry.query.toLowerCase() === trimmed);
  const next = savedSearches.filter((entry) => entry.query.toLowerCase() !== trimmed);
  if (next.length === savedSearches.length) return;
  savedSearches = next;
  persist();
  notify();

  if (authAccountId && removed) {
    enqueueOperation(savedSearchSyncAdapter.createOperation("delete", removed.id, removed));
    void performSync();
  }
}

/**
 * PR-094.02 — applies a real pulled remote Saved Search directly,
 * bypassing the Sync Queue entirely (the same shape
 * `applyRemoteRecentSearches()` already established). Upserts by id: a
 * duplicate/replayed create for an id already present locally is a real
 * no-op-by-overwrite, never a second entry. Never called for a local
 * edit — only by `lib/hooks/useCloudSyncActivation.ts`, after
 * `performPull()` has already confirmed no unsynced local change
 * conflicts with it.
 */
export function applyRemoteSavedSearch(entry: SavedSearch): void {
  ensureHydrated();
  if (!isValidSavedSearch(entry)) return;
  const next = savedSearches.filter((existing) => existing.id !== entry.id);
  savedSearches = [entry, ...next];
  persist();
  notify();
}

/** PR-094.02 — applies a real pulled remote deletion (tombstone) directly, bypassing the Sync Queue. A genuine no-op for an id not present locally — a record this device never saw is already correctly absent. */
export function removeSavedSearchLocally(id: string): void {
  ensureHydrated();
  const next = savedSearches.filter((entry) => entry.id !== id);
  if (next.length === savedSearches.length) return;
  savedSearches = next;
  persist();
  notify();
}

export function subscribeToSavedSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
