/** Bumped whenever `Watchlist`'s shape changes in a way old persisted data wouldn't satisfy — `storage.ts` discards anything that doesn't match. */
export const WATCHLIST_VERSION = 1 as const;

export const WATCHLIST_STORAGE_KEY = "base-radar:watchlist";
