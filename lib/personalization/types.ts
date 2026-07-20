/**
 * The Personalization Layer's data model — multiple named, user-organized
 * project collections ("watchlists"). This is a distinct concept from
 * `lib/watchlist/`'s single flat list (which remains the source of truth
 * every intelligence layer reads from): a `PersonalWatchlist` is a
 * client-side organizational tool, not a signal that feeds any engine.
 */

/** A small, curated icon set — closed, not arbitrary, matching every other closed-vocabulary union in this app (e.g. `NotificationType`, `AutomationTriggerType`). Mapped to real `lucide-react` icons in the UI layer only (`components/watchlists/`), keeping this file framework-agnostic. */
export const WATCHLIST_ICONS = [
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
] as const;
export type WatchlistIconKey = (typeof WATCHLIST_ICONS)[number];

/** A small, curated color set mapped to real design-system tokens in the UI layer — never an arbitrary hex value. */
export const WATCHLIST_COLORS = [
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
] as const;
export type WatchlistColorKey = (typeof WATCHLIST_COLORS)[number];

export type PersonalWatchlist = {
  id: string;
  name: string;
  description: string;
  icon: WatchlistIconKey;
  color: WatchlistColorKey;
  /** Project Registry ids only — never a duplicated `Project` object. */
  projectIds: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PersonalizationState = {
  version: number;
  watchlists: PersonalWatchlist[];
  /** Exactly one watchlist may be active at a time, or `null` if every watchlist has been deleted. Does not yet filter any Dashboard widget — that's PR22 Part 2. */
  activeWatchlistId: string | null;
};
