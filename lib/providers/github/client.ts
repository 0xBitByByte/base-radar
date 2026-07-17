/**
 * GitHub REST API — free, unauthenticated (rate-limited to 60 req/hr per IP).
 * https://docs.github.com/en/rest
 */

import { fetchJson } from "@/lib/providers/common/utilities";

export type RawRepo = {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: { name: string } | null;
  created_at: string;
  pushed_at: string;
};

export type RawRelease = {
  tag_name: string;
  published_at: string;
  /** PR13.9 — real release notes, already present on this same response; `null` for tags with no notes written. Only read for the Timeline/Recent-Developments "supporting detail" use case, never for `/releases/latest`'s Engineering Health tile (which never needed it). */
  body: string | null;
};

/** One week's commit activity — `days` is 7 ints (Sun-Sat), `total` their sum. Most recent week is last in the array. */
export type RawCommitActivityWeek = {
  days: number[];
  total: number;
  week: number;
};

export type RawContributor = {
  login: string;
  contributions: number;
};

const HEADERS = { accept: "application/vnd.github+json" };

export async function fetchRepo(fullName: string): Promise<RawRepo> {
  return fetchJson<RawRepo>("github", `https://api.github.com/repos/${fullName}`, { headers: HEADERS });
}

export async function fetchLatestRelease(fullName: string): Promise<RawRelease> {
  return fetchJson<RawRelease>("github", `https://api.github.com/repos/${fullName}/releases/latest`, {
    headers: HEADERS,
  });
}

/** Up to 10 most recent releases, newest first — real version history (PR13.7 Goal 13), not just the single latest tag. */
export async function fetchReleases(fullName: string, perPage = 10): Promise<RawRelease[]> {
  return fetchJson<RawRelease[]>("github", `https://api.github.com/repos/${fullName}/releases?per_page=${perPage}`, {
    headers: HEADERS,
  });
}

/**
 * Up to 100 contributors, sorted by contribution count desc — GitHub has no
 * cheap "just give me the count" endpoint, so this is the real page-1 list;
 * the mapper reports `items.length` and whether it hit the 100-item cap
 * (never claims an exact count beyond what was actually counted).
 */
export async function fetchContributors(fullName: string): Promise<RawContributor[]> {
  return fetchJson<RawContributor[]>("github", `https://api.github.com/repos/${fullName}/contributors?per_page=100&anon=true`, {
    headers: HEADERS,
  });
}

/**
 * Weekly commit-count buckets for the last year. GitHub computes this
 * asynchronously server-side — a first request for a repo it hasn't cached
 * yet can return `202 Accepted` with an empty body while it builds the
 * stats; `fetchJson`'s retry (transient 5xx/timeout only) won't catch a
 * 202, so an empty array here is a real, expected "not ready yet" outcome,
 * not a failure — the mapper treats it as "no data" rather than throwing.
 *
 * Uses the shared default timeout/retry budget — this is no longer a
 * page-blocking concern (the Project Profile page fetches this off the
 * critical render path and streams it in via `Suspense`, see
 * `ProfileCommitsAsync`), so there's no remaining benefit to cutting a
 * still-computing repo's request short.
 */
export async function fetchCommitActivity(fullName: string): Promise<RawCommitActivityWeek[]> {
  return fetchJson<RawCommitActivityWeek[]>(
    "github",
    `https://api.github.com/repos/${fullName}/stats/commit_activity`,
    { headers: HEADERS }
  );
}
