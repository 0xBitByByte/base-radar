/**
 * V4-FUTURE-002B — the one generic "shareable bundle" shape ANY sharing
 * feature in this app produces. Extracted out of `lib/report-share/`
 * specifically because this phase's brief requires Report Sharing and a
 * future Chat Sharing to both consume the SAME type — the same "a second
 * feature needs this, so it belongs in a shared module" signal that moved
 * `lib/export/` out of `lib/report-export/` earlier this arc.
 */

export type ShareStats = {
  /** Count of sections with at least one real row — an empty, toggled-off section is never counted as "included." */
  sectionsIncluded: number;
  /** Computed from the plain-TEXT rendering only, never markdown/HTML syntax. */
  wordCount: number;
  /** `ceil(wordCount / 200)`, minimum 1 — the standard "average adult reading speed" estimate, never a generated summary of length. */
  estimatedReadingMinutes: number;
};

export type ShareProfile = {
  title: string;
  summary: string;
  description: string;
  markdown: string;
  text: string;
  html: string;
  stats: ShareStats;
  generatedAt: string;
};
