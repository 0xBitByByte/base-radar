/** Raw GitHub responses → domain models. Pure functions, no I/O. */

import type { RawCommitActivityWeek, RawContributor, RawRelease, RawRepo } from "@/lib/providers/github/client";

export type RepoStats = {
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: string | null;
  /** PR13.9 — one-line summary of the latest release's real notes, read from the same `fetchLatestRelease` response `getRepoStats` already fetches on the fast path. `null` when GitHub has no notes on record. */
  latestReleaseNoteSummary: string | null;
  language: string | null;
  license: string | null;
  createdAt: string;
  pushedAt: string;
  /** PR15.2 — real, current archived status, for the Alert Engine's GitHub provider. */
  archived: boolean;
};

export function mapRepoStats(fullName: string, repo: RawRepo, release: RawRelease | null): RepoStats {
  return {
    fullName,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    latestReleaseTag: release?.tag_name ?? null,
    latestReleasePublishedAt: release?.published_at ?? null,
    latestReleaseNoteSummary: summarizeReleaseNote(release?.body ?? null),
    language: repo.language ?? null,
    license: repo.license?.name ?? null,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    archived: repo.archived,
  };
}

export type CommitActivity = {
  fullName: string;
  commitsLast7d: number;
  commitsPrev7d: number;
  /** Sum of the last ~13 weekly buckets (PR13.7 Goal 6) — real evidence for the Health Scorecard's Developer tile, not a new fetch: the commit-activity endpoint already returns a full year of weekly buckets, this just reads more of the same response. */
  commitsLast90d: number;
  /** Positive = accelerating, negative = slowing, relative to the prior week. */
  trendPct: number | null;
};

const WEEKS_IN_90_DAYS = 13;

export function mapCommitActivity(fullName: string, weeks: RawCommitActivityWeek[]): CommitActivity | null {
  if (weeks.length === 0) return null;

  const lastWeek = weeks[weeks.length - 1];
  const prevWeek = weeks[weeks.length - 2];
  const commitsLast7d = lastWeek?.total ?? 0;
  const commitsPrev7d = prevWeek?.total ?? 0;
  const commitsLast90d = weeks.slice(-WEEKS_IN_90_DAYS).reduce((sum, week) => sum + week.total, 0);

  return {
    fullName,
    commitsLast7d,
    commitsPrev7d,
    commitsLast90d,
    trendPct: commitsPrev7d > 0 ? ((commitsLast7d - commitsPrev7d) / commitsPrev7d) * 100 : null,
  };
}

export type ContributorCount = {
  /** Real count of contributors actually returned (page 1, up to 100) — never a guessed/extrapolated total. */
  count: number;
  /** `true` when the response hit the 100-item page cap — the real count may be higher, so the UI shows "100+" instead of implying exactness. */
  hitCap: boolean;
};

export function mapContributorCount(raw: RawContributor[]): ContributorCount {
  return { count: raw.length, hitCap: raw.length === 100 };
}

export type ReleaseSummary = {
  tag: string;
  publishedAt: string | null;
  /** PR13.9 — the release's first real line of notes, cleaned/truncated for a one-line "supporting detail" (Recent Developments). `null` when GitHub has no notes on record for this tag — never a fabricated summary. */
  noteSummary: string | null;
};

/** Auto-generated changelog section headers (semantic-release/conventional-commits convention) that carry no real content on their own — skipped in favor of the actual bullet underneath. */
const GENERIC_RELEASE_HEADINGS = new Set([
  "bug fixes",
  "features",
  "feature",
  "performance improvements",
  "breaking changes",
  "reverts",
  "documentation",
  "chores",
  "chore",
  "refactor",
  "refactoring",
  "tests",
  "style",
  "ci",
  "build",
]);

/** Strips Markdown link/bold/code syntax and trailing PR/commit-hash references down to plain, readable text — e.g. `"Fix typos ([#950](url)) ([682e86c](url))"` -> `"Fix typos"`. */
function cleanReleaseLine(line: string): string {
  return line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Markdown links -> their visible text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/\s*\(#\d+\)/g, "") // PR/issue references, e.g. "(#950)"
    .replace(/\s*\([0-9a-f]{7,40}\)/g, "") // commit hashes, e.g. "(682e86c)"
    .trim();
}

/**
 * First real, readable line of a release's Markdown body — skipping blank
 * lines, the auto-generated "vX.Y.Z (date)" title line semantic-release
 * puts first, and bare changelog category headings ("### Bug Fixes") that
 * carry no content of their own — down to the actual change description.
 * `null` when a release body has no usable line (e.g. an empty body).
 */
function summarizeReleaseNote(body: string | null): string | null {
  if (!body) return null;

  for (const rawLine of body.split("\n")) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) continue;

    const withoutMarkers = trimmed.replace(/^#{1,6}\s*/, "").replace(/^[-*]\s*/, "");
    const cleaned = cleanReleaseLine(withoutMarkers);
    if (cleaned.length === 0) continue;
    if (/^v?\d[\d.]*\s*\(\d{4}-\d{2}-\d{2}\)$/i.test(cleaned)) continue; // e.g. "1.19.4 (2024-06-19)"
    if (GENERIC_RELEASE_HEADINGS.has(cleaned.toLowerCase())) continue;

    return cleaned.length > 140 ? `${cleaned.slice(0, 137)}...` : cleaned;
  }

  return null;
}

/** Up to 10 most recent releases, newest first (GitHub's own list order) — real version history for PR13.7 Goal 13's Timeline, the release-count evidence for Goal 6's Scorecard tile, and (PR13.9) a real one-line note summary for Recent Developments' supporting detail. */
export function mapReleases(raw: RawRelease[]): ReleaseSummary[] {
  return raw.map((release) => ({
    tag: release.tag_name,
    publishedAt: release.published_at ?? null,
    noteSummary: summarizeReleaseNote(release.body),
  }));
}
