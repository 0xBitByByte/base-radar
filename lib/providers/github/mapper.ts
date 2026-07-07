import type { RawRelease, RawRepo } from "@/lib/providers/github/client";

export type RepoStats = {
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: string | null;
};

export function mapRepoStats(fullName: string, repo: RawRepo, release: RawRelease | null): RepoStats {
  return {
    fullName,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    latestReleaseTag: release?.tag_name ?? null,
    latestReleasePublishedAt: release?.published_at ?? null,
  };
}
