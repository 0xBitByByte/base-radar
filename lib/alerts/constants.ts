/** Bumped whenever `AlertsState`'s shape changes in a way old persisted data wouldn't satisfy — `storage.ts` discards anything that doesn't match. */
export const ALERTS_VERSION = 1 as const;

export const ALERTS_STORAGE_KEY = "base-radar:alerts";
