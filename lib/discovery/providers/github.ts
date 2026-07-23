/**
 * Placeholder — every existing GitHub wrapper (`lib/providers/github/
 * service.ts`) fetches stats for a single, already-known `fullName` (repo
 * stats, commit activity, contributors, releases); none of them search or
 * list repos. Discovering candidates via GitHub would need a genuinely new
 * integration (e.g. the GitHub Search API, topic search), which this PR
 * does not add per its "lightweight wrappers already exist" constraint.
 * Resolves immediately with zero candidates.
 */

import { recordDiscoverySuccess } from "@/lib/discovery/health";
import type { DiscoveryProvider, DiscoveryResult } from "@/lib/discovery/provider";

const SOURCE = "github" as const;

export const githubDiscoveryProvider: DiscoveryProvider = {
  source: SOURCE,

  async discover(): Promise<DiscoveryResult> {
    const fetchedAt = new Date().toISOString();
    recordDiscoverySuccess(SOURCE, 0, fetchedAt);
    return { source: SOURCE, candidates: [], fetchedAt };
  },
};
