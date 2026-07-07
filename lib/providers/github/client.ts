/**
 * GitHub REST API — free, unauthenticated (rate-limited to 60 req/hr per IP).
 * https://docs.github.com/en/rest
 */

import { fetchJson } from "@/lib/providers/common/utilities";

export type RawRepo = {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
};

export type RawRelease = {
  tag_name: string;
  published_at: string;
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
