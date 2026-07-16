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
};

/** One week's commit activity — `days` is 7 ints (Sun-Sat), `total` their sum. Most recent week is last in the array. */
export type RawCommitActivityWeek = {
  days: number[];
  total: number;
  week: number;
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

/**
 * Weekly commit-count buckets for the last year. GitHub computes this
 * asynchronously server-side — a first request for a repo it hasn't cached
 * yet can return `202 Accepted` with an empty body while it builds the
 * stats; `fetchJson`'s retry (transient 5xx/timeout only) won't catch a
 * 202, so an empty array here is a real, expected "not ready yet" outcome,
 * not a failure — the mapper treats it as "no data" rather than throwing.
 */
export async function fetchCommitActivity(fullName: string): Promise<RawCommitActivityWeek[]> {
  return fetchJson<RawCommitActivityWeek[]>(
    "github",
    `https://api.github.com/repos/${fullName}/stats/commit_activity`,
    { headers: HEADERS }
  );
}
