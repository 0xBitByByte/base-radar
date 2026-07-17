"use client";

import { use } from "react";

import { ScorecardCardView, scorecardTileToMetaCard } from "@/components/explorer/ProjectHealthScorecard";
import { buildDeveloperEvidenceTile, type ScorecardTile } from "@/lib/intelligence/scorecard";
import type { CommitActivity, ContributorCount, ReleaseSummary } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileDeveloperTileAsyncProps = {
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
  fallback: ScorecardTile;
};

/**
 * PR13.7 Goal 6 — unwraps the three extended/streamed GitHub calls this
 * evidence tile needs (`commitActivityPromise`/`contributorCountPromise`,
 * both already fetched for Engineering Health and Community Metrics;
 * `releasesPromise`, new — shared with Goal 13's Timeline version history,
 * never fetched twice) without awaiting any of them itself. `use()`
 * suspends only this one Scorecard cell behind its own `<Suspense>`, same
 * pattern as `ProfileCommitsAsync`/`ProfileContributorsAsync`. Renders
 * through `ScorecardCardView` directly (imported from
 * `ProjectHealthScorecard`, not passed in as a render-prop — a Server
 * Component can't hand a function down to a Client Component as a prop) so
 * the streamed-in evidence tile shares the exact same card markup as every
 * synchronous tile in the grid.
 */
export function ProfileDeveloperTileAsync({
  commitActivityPromise,
  contributorCountPromise,
  releasesPromise,
  fallback,
}: ProfileDeveloperTileAsyncProps) {
  const commitResult = use(commitActivityPromise);
  const contributorResult = use(contributorCountPromise);
  const releasesResult = use(releasesPromise);

  const commitsLast90d = commitResult?.ok ? commitResult.data.commitsLast90d : null;
  const contributorCount = contributorResult?.ok ? contributorResult.data.count : null;
  const releaseCount = releasesResult?.ok ? releasesResult.data.length : null;

  const tile = buildDeveloperEvidenceTile(commitsLast90d, contributorCount, releaseCount, fallback);
  return <ScorecardCardView card={scorecardTileToMetaCard("developer", tile)} />;
}
