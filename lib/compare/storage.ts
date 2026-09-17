/**
 * PR-091 (Compare Platform) — the Compare list's runtime cache and
 * persistence. Same shape every other local store in this app already uses
 * (`lib/ai-watch/storage.ts`, `lib/personalization/storage.ts`): an
 * in-memory cache, an SSR-safe versioned `localStorage` envelope that falls
 * back to an empty list on any corruption rather than throwing, and a
 * `subscribe`/`notify` pair shaped for `useSyncExternalStore`.
 *
 * Local-device only — no cloud sync, no cross-device behavior. Never
 * implied otherwise in any UI copy that reads this store.
 */

import { MAX_COMPARE_PROJECTS, type CompareState } from "@/lib/compare/types";

const STORAGE_KEY = "base-radar:compare";
const STORAGE_VERSION = 1;

const DEFAULT_STATE: CompareState = { projectIds: [] };

type PersistedCompare = { version: number; state: CompareState };

function isValidState(value: unknown): value is CompareState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CompareState>;
  return Array.isArray(candidate.projectIds) && candidate.projectIds.every((id) => typeof id === "string");
}

let cached: CompareState = DEFAULT_STATE;
let hydrated = false;

/** SSR-safe, resilient to a corrupted/foreign value under this key — starts from the honest empty default rather than throwing. */
function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedCompare>;
      if (parsed.version === STORAGE_VERSION && isValidState(parsed.state)) cached = parsed.state;
    }
  } catch {
    // Corrupted value — start with an empty list, never a fabricated one.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state: cached } satisfies PersistedCompare));
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

export function getCompareState(): CompareState {
  ensureHydrated();
  return cached;
}

/** No-op past `MAX_COMPARE_PROJECTS` or for an id already in the list — the caller's `isFull`/`isComparing` reads are what should have prevented the call in the first place; this is just the honest, safe floor under that. */
export function addToCompare(projectId: string): void {
  ensureHydrated();
  if (cached.projectIds.includes(projectId) || cached.projectIds.length >= MAX_COMPARE_PROJECTS) return;
  cached = { projectIds: [...cached.projectIds, projectId] };
  persist();
  notify();
}

export function removeFromCompare(projectId: string): void {
  ensureHydrated();
  if (!cached.projectIds.includes(projectId)) return;
  cached = { projectIds: cached.projectIds.filter((id) => id !== projectId) };
  persist();
  notify();
}

export function clearCompare(): void {
  ensureHydrated();
  if (cached.projectIds.length === 0) return;
  cached = DEFAULT_STATE;
  persist();
  notify();
}
