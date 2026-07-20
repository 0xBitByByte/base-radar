/**
 * The Personalization Layer's own store — multiple named, user-organized
 * project collections ("watchlists"). Completely separate from
 * `lib/watchlist/`, which remains the single source of truth every
 * intelligence layer (Portfolio Intelligence, Daily Brief, Timeline, ...)
 * reads from — this module is never read by any engine, and this PR does
 * not wire it into any of them (that's PR22 Part 2). A pure client-side
 * organization tool.
 *
 * Framework-agnostic (no React import) with one in-memory `cached`
 * snapshot as the source of truth for every read, exactly like
 * `lib/watchlist/service.ts` — every mutation updates it and notifies
 * subscribers synchronously, so a change is reflected everywhere in the
 * app on the same tick. Backed by `localStorage` with a version-guarded
 * envelope; missing, corrupted, or older-version data all fall back to the
 * same default watchlist set rather than throwing or partially recovering
 * (there is no safe way to partially recover a corrupted user collection).
 */

import type { SanitizedImportWatchlist } from "@/lib/personalization/importExport";
import { getPersonalizationPreferences } from "@/lib/personalization/preferences";
import type { PersonalizationState, PersonalWatchlist, WatchlistColorKey, WatchlistIconKey } from "@/lib/personalization/types";

const PERSONALIZATION_STORAGE_KEY = "base-radar:personalization";
const PERSONALIZATION_VERSION = 1;

/** A static seed timestamp for the default watchlists — these are configuration, not real user-created records, so a fixed illustrative date is honest here (never `Date.now()`, never implying the user just created them). Matches `lib/automation/rules.ts`'s own `DEFAULT_RULE_TIMESTAMP` precedent. */
const DEFAULT_TIMESTAMP = "2025-01-01T00:00:00.000Z";

const WATCHLIST_ICON_SET = new Set<string>([
  "star",
  "sparkles",
  "layers",
  "server",
  "gamepad",
  "coins",
  "folder",
  "rocket",
  "shield",
  "flame",
]);
const WATCHLIST_COLOR_SET = new Set<string>([
  "primary",
  "purple",
  "blue",
  "green",
  "orange",
  "pink",
  "cyan",
  "yellow",
  "red",
  "gray",
]);

/**
 * Created automatically on first launch — empty containers the user fills
 * in themselves via the project picker (never pre-populated by guessing
 * category membership, which would risk fabricating a list the user never
 * actually curated). Editable and deletable like any other watchlist.
 */
function buildDefaultWatchlists(): PersonalWatchlist[] {
  return [
    {
      id: "watchlist:favorites",
      name: "Favorites",
      description: "Your hand-picked favorite projects.",
      icon: "star",
      color: "yellow",
      projectIds: [],
      pinned: true,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
    {
      id: "watchlist:ai",
      name: "AI",
      description: "AI agents and AI-native projects building on Base.",
      icon: "sparkles",
      color: "purple",
      projectIds: [],
      pinned: false,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
    {
      id: "watchlist:defi",
      name: "DeFi",
      description: "Decentralized finance protocols — DEXs, lending, yield, derivatives.",
      icon: "coins",
      color: "green",
      projectIds: [],
      pinned: false,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
    {
      id: "watchlist:infrastructure",
      name: "Infrastructure",
      description: "Core infrastructure, bridges, and developer tooling.",
      icon: "server",
      color: "blue",
      projectIds: [],
      pinned: false,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
    {
      id: "watchlist:gaming",
      name: "Gaming",
      description: "Gaming and metaverse projects.",
      icon: "gamepad",
      color: "pink",
      projectIds: [],
      pinned: false,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
    {
      id: "watchlist:stablecoins",
      name: "Stablecoins",
      description: "Stablecoin issuers and related infrastructure.",
      icon: "shield",
      color: "cyan",
      projectIds: [],
      pinned: false,
      createdAt: DEFAULT_TIMESTAMP,
      updatedAt: DEFAULT_TIMESTAMP,
    },
  ];
}

function buildDefaultState(): PersonalizationState {
  const watchlists = buildDefaultWatchlists();
  return { version: PERSONALIZATION_VERSION, watchlists, activeWatchlistId: watchlists[0].id };
}

function isValidWatchlist(value: unknown): value is PersonalWatchlist {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersonalWatchlist>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.icon === "string" &&
    WATCHLIST_ICON_SET.has(candidate.icon) &&
    typeof candidate.color === "string" &&
    WATCHLIST_COLOR_SET.has(candidate.color) &&
    Array.isArray(candidate.projectIds) &&
    candidate.projectIds.every((id) => typeof id === "string") &&
    typeof candidate.pinned === "boolean" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function isValidState(value: unknown): value is PersonalizationState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersonalizationState>;
  if (candidate.version !== PERSONALIZATION_VERSION) return false;
  if (!Array.isArray(candidate.watchlists) || !candidate.watchlists.every(isValidWatchlist)) return false;
  if (candidate.activeWatchlistId !== null && typeof candidate.activeWatchlistId !== "string") return false;
  return true;
}

/**
 * SSR-safe (`window` doesn't exist server-side) and resilient to missing,
 * corrupted, or older-version data — every failure mode falls back to the
 * same default watchlist set rather than throwing.
 *
 * PR22 Part 3: also honors the `rememberActiveWatchlist` preference at this
 * one read — module load (once per session/reload). When the preference is
 * off, the session starts with no active watchlist rather than restoring
 * the last one, WITHOUT touching the persisted value on disk (so switching
 * the preference back on and reloading restores it) and WITHOUT affecting
 * any mutation for the rest of THIS session — picking an active watchlist
 * via `setActiveWatchlist()` still works completely normally afterward.
 */
function readState(): PersonalizationState {
  if (typeof window === "undefined") return buildDefaultState();

  try {
    const raw = window.localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return buildDefaultState();
    if (!getPersonalizationPreferences().rememberActiveWatchlist) {
      return { ...parsed, activeWatchlistId: null };
    }
    return parsed;
  } catch {
    return buildDefaultState();
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing); the in-memory cache stays correct for the rest of this tab's session even if it won't survive a refresh. */
function writeState(state: PersonalizationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

let cached: PersonalizationState = readState();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: PersonalizationState): void {
  cached = next;
  writeState(next);
  notify();
}

function generateId(): string {
  return `watchlist:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The current snapshot — same object reference until the next mutation, so `useSyncExternalStore` never re-renders on an unrelated call. */
export function getPersonalizationState(): PersonalizationState {
  return cached;
}

export function createWatchlist(input: {
  name: string;
  description: string;
  icon: WatchlistIconKey;
  color: WatchlistColorKey;
}): string {
  const now = new Date().toISOString();
  const id = generateId();
  const watchlist: PersonalWatchlist = {
    id,
    name: input.name,
    description: input.description,
    icon: input.icon,
    color: input.color,
    projectIds: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  persist({ ...cached, watchlists: [...cached.watchlists, watchlist] });
  return id;
}

export function updateWatchlist(
  id: string,
  patch: Partial<Pick<PersonalWatchlist, "name" | "description" | "icon" | "color">>
): void {
  const now = new Date().toISOString();
  persist({
    ...cached,
    watchlists: cached.watchlists.map((watchlist) =>
      watchlist.id === id ? { ...watchlist, ...patch, updatedAt: now } : watchlist
    ),
  });
}

/** If the deleted watchlist was active, promotes the first remaining pinned watchlist (else the first remaining watchlist, else `null` if none are left) — never leaves `activeWatchlistId` pointing at a watchlist that no longer exists. */
export function deleteWatchlist(id: string): void {
  const remaining = cached.watchlists.filter((watchlist) => watchlist.id !== id);
  if (remaining.length === cached.watchlists.length) return; // nothing to delete

  let activeWatchlistId = cached.activeWatchlistId;
  if (activeWatchlistId === id) {
    const nextActive = remaining.find((watchlist) => watchlist.pinned) ?? remaining[0] ?? null;
    activeWatchlistId = nextActive?.id ?? null;
  }
  persist({ ...cached, watchlists: remaining, activeWatchlistId });
}

/** The duplicate is inserted immediately after its source, never pinned (avoids silently creating a second pinned entry), with fresh timestamps and id — everything else (name suffixed, description, icon, color, project membership) copied exactly. */
export function duplicateWatchlist(id: string): string | null {
  const source = cached.watchlists.find((watchlist) => watchlist.id === id);
  if (!source) return null;

  const now = new Date().toISOString();
  const newId = generateId();
  const duplicate: PersonalWatchlist = {
    ...source,
    id: newId,
    name: `${source.name} (Copy)`,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  const index = cached.watchlists.findIndex((watchlist) => watchlist.id === id);
  const watchlists = [...cached.watchlists.slice(0, index + 1), duplicate, ...cached.watchlists.slice(index + 1)];
  persist({ ...cached, watchlists });
  return newId;
}

/** Reorders to match `orderedIds` exactly; any watchlist not present in it (shouldn't normally happen) is kept and appended at the end, so a mutation never silently drops data. */
export function reorderWatchlists(orderedIds: string[]): void {
  const byId = new Map(cached.watchlists.map((watchlist) => [watchlist.id, watchlist]));
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter((watchlist): watchlist is PersonalWatchlist => watchlist !== undefined);
  const missing = cached.watchlists.filter((watchlist) => !orderedIds.includes(watchlist.id));
  persist({ ...cached, watchlists: [...reordered, ...missing] });
}

export function setPinned(id: string, pinned: boolean): void {
  const now = new Date().toISOString();
  persist({
    ...cached,
    watchlists: cached.watchlists.map((watchlist) => (watchlist.id === id ? { ...watchlist, pinned, updatedAt: now } : watchlist)),
  });
}

/** Only one watchlist may be active at a time; `null` clears it. Silently ignores an `id` that doesn't exist rather than pointing at a dangling reference. */
export function setActiveWatchlist(id: string | null): void {
  if (id !== null && !cached.watchlists.some((watchlist) => watchlist.id === id)) return;
  persist({ ...cached, activeWatchlistId: id });
}

export function addProjectToWatchlist(watchlistId: string, projectId: string): void {
  const now = new Date().toISOString();
  persist({
    ...cached,
    watchlists: cached.watchlists.map((watchlist) =>
      watchlist.id === watchlistId && !watchlist.projectIds.includes(projectId)
        ? { ...watchlist, projectIds: [...watchlist.projectIds, projectId], updatedAt: now }
        : watchlist
    ),
  });
}

export function removeProjectFromWatchlist(watchlistId: string, projectId: string): void {
  const now = new Date().toISOString();
  persist({
    ...cached,
    watchlists: cached.watchlists.map((watchlist) =>
      watchlist.id === watchlistId && watchlist.projectIds.includes(projectId)
        ? { ...watchlist, projectIds: watchlist.projectIds.filter((existing) => existing !== projectId), updatedAt: now }
        : watchlist
    ),
  });
}

/**
 * Applies already-validated import entries (see
 * `lib/personalization/importExport.ts`'s `validateWatchlistImport`) —
 * purely additive, never overwrites an existing watchlist. Every imported
 * entry gets a fresh id (never trusts an id from the file) and a name
 * disambiguated with an " (Imported)" suffix if it collides with an
 * existing watchlist's name, so two watchlists can never silently merge
 * into one. Returns the number of watchlists actually added.
 */
export function importWatchlists(entries: SanitizedImportWatchlist[]): number {
  if (entries.length === 0) return 0;

  const existingNames = new Set(cached.watchlists.map((watchlist) => watchlist.name.trim().toLowerCase()));
  const now = new Date().toISOString();

  const imported: PersonalWatchlist[] = entries.map((entry) => {
    let name = entry.name;
    if (existingNames.has(name.toLowerCase())) {
      name = `${entry.name} (Imported)`;
    }
    existingNames.add(name.toLowerCase());

    return {
      id: generateId(),
      name,
      description: entry.description,
      icon: entry.icon,
      color: entry.color,
      projectIds: entry.projectIds,
      pinned: false,
      createdAt: entry.createdAt,
      updatedAt: now,
    };
  });

  persist({ ...cached, watchlists: [...cached.watchlists, ...imported] });
  return imported.length;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
