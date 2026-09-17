/**
 * PR-093.04 (Personalization) — "Recently Viewed Projects," a genuinely
 * missing local-only capability confirmed absent during this PR's own
 * audit (no "recently viewed"/"research history" concept existed anywhere
 * in the codebase — distinct from the already-real Wallet History feature,
 * which tracks portfolio-value snapshots, not project-page visits). Same
 * local-device-only, no-backend shape as every other Personalization
 * primitive (`lib/personalization/`, `lib/search/storage.ts`'s Recent
 * Searches) — this is a rolling list of real page visits, never a
 * server-synced "research" record.
 */

export type RecentlyViewedEntry = {
  projectId: string;
  projectName: string;
  projectSlug: string;
  /** The real moment this device last viewed the project — re-viewing moves the entry to the front with a fresh timestamp, never a duplicate entry. */
  viewedAt: string;
};

export type RecentlyViewedState = {
  version: number;
  entries: RecentlyViewedEntry[];
};
