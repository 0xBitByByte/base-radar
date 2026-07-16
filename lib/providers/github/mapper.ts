/** Raw GitHub responses → domain models. Pure functions, no I/O. */

import type { RawCommitActivityWeek, RawRelease, RawRepo } from "@/lib/providers/github/client";

export type RepoStats = {
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: string | null;
  language: string | null;
  license: string | null;
  createdAt: string;
  pushedAt: string;
};

export function mapRepoStats(fullName: string, repo: RawRepo, release: RawRelease | null): RepoStats {
  return {
    fullName,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    latestReleaseTag: release?.tag_name ?? null,
    latestReleasePublishedAt: release?.published_at ?? null,
    language: repo.language ?? null,
    license: repo.license?.name ?? null,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
  };
}

export type CommitActivity = {
  fullName: string;
  commitsLast7d: number;
  commitsPrev7d: number;
  /** Positive = accelerating, negative = slowing, relative to the prior week. */
  trendPct: number | null;
};

export function mapCommitActivity(fullName: string, weeks: RawCommitActivityWeek[]): CommitActivity | null {
  if (weeks.length === 0) return null;

  const lastWeek = weeks[weeks.length - 1];
  const prevWeek = weeks[weeks.length - 2];
  const commitsLast7d = lastWeek?.total ?? 0;
  const commitsPrev7d = prevWeek?.total ?? 0;

  return {
    fullName,
    commitsLast7d,
    commitsPrev7d,
    trendPct: commitsPrev7d > 0 ? ((commitsLast7d - commitsPrev7d) / commitsPrev7d) * 100 : null,
  };
}
