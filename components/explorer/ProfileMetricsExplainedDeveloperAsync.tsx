"use client";

import { use } from "react";

import { MetricExplanationCard } from "@/components/explorer/MetricExplanationCard";
import { buildDeveloperMetricExplanation } from "@/lib/intelligence/report";
import type { ScorecardTile } from "@/lib/intelligence/scorecard";
import type { CommitActivity, ContributorCount, ReleaseSummary } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileMetricsExplainedDeveloperAsyncProps = {
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
  fallbackTile: ScorecardTile;
};

/**
 * PR13.8 Goal 5's own worked example ("Developer Activity 100/100 — 26
 * contributors, 10 releases") needs the same extended/streamed GitHub data
 * the Scorecard's Developer tile already uses — this reuses the exact same
 * promises `page.tsx` already threads to `ProfileDeveloperTileAsync`, never
 * a new fetch. `use()` suspends only this one Key Metrics Explained card
 * behind its own `<Suspense>`; the fallback is the same fast-path tile the
 * synchronous cards in this section render before this resolves.
 */
export function ProfileMetricsExplainedDeveloperAsync({
  commitActivityPromise,
  contributorCountPromise,
  releasesPromise,
  fallbackTile,
}: ProfileMetricsExplainedDeveloperAsyncProps) {
  const commitResult = use(commitActivityPromise);
  const contributorResult = use(contributorCountPromise);
  const releasesResult = use(releasesPromise);

  const explanation = buildDeveloperMetricExplanation(
    commitResult?.ok ? commitResult.data.commitsLast90d : null,
    contributorResult?.ok ? contributorResult.data.count : null,
    releasesResult?.ok ? releasesResult.data.length : null,
    fallbackTile
  );

  return <MetricExplanationCard explanation={explanation} />;
}
