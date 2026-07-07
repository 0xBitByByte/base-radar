/**
 * GitHub REST API — free, unauthenticated (rate-limited to 60 req/hr per IP).
 * https://docs.github.com/en/rest
 */

import type { RepoStats } from "@/lib/data/types";

const REVALIDATE_SECONDS = 600;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/vnd.github+json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`GitHub request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function getRepoStats(fullName: string): Promise<RepoStats | null> {
  try {
    const repo = await fetchJson<{
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
    }>(`https://api.github.com/repos/${fullName}`);

    let latestReleaseTag: string | null = null;
    let latestReleasePublishedAt: string | null = null;
    try {
      const release = await fetchJson<{ tag_name: string; published_at: string }>(
        `https://api.github.com/repos/${fullName}/releases/latest`
      );
      latestReleaseTag = release.tag_name;
      latestReleasePublishedAt = release.published_at;
    } catch {
      // Repos without releases are common — this is not a hard failure.
    }

    return {
      fullName,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      latestReleaseTag,
      latestReleasePublishedAt,
    };
  } catch {
    return null;
  }
}
