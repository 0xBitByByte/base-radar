"use client";

import { use } from "react";

import { ProfileTimeline } from "@/components/explorer/ProfileTimeline";
import { changePctOverDays } from "@/lib/intelligence/merge";
import { buildProjectTimeline } from "@/lib/intelligence/timeline";
import type { GithubIntel, Risk, Tvl } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance";
import type { WhaleEvent } from "@/lib/whale/types";
import type { Signal } from "@/lib/data/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { CommitActivity, ReleaseSummary } from "@/lib/providers/github/service";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileTimelineAsyncProps = {
  /** First-paint `GithubIntel` — real stars/forks/release fields, `commitsLast7d`/`commitsPrev7d`/`commitTrendPct` still `null` until `commitActivityPromise` resolves. */
  github: GithubIntel;
  /** First-paint `Tvl` — real current value/24h change, `changePct7d`/`changePct30d` still `null` until `tvlHistoryPromise` resolves. */
  tvl: Tvl | null;
  risk: Risk | null;
  governanceEvents: GovernanceEvent[];
  whaleEvents: WhaleEvent[];
  signals: Signal[];
  tokenSymbol: string | null;
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  tvlHistoryPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
  transfersPromise: Promise<ProviderResult<TokenTransfer[]> | null>;
  /** PR13.7 Goal 13 — real recent releases, shared with the Scorecard's Developer evidence tile (same fetch, never duplicated). */
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
};

/**
 * The Activity Feed timeline merges commit activity, TVL swings, and token
 * transfers alongside governance/whale/signal events that are already fast
 * — rather than rendering an incomplete feed on first paint and never
 * updating it (this is server-rendered HTML; there's no client-side re-run
 * once streamed), the whole timeline waits behind one `<Suspense>` for
 * whichever of its three slow inputs is last to resolve, then calls
 * `buildProjectTimeline` exactly once with the complete, real picture —
 * the same pure function this page always used, unmodified.
 */
export function ProfileTimelineAsync({
  github,
  tvl,
  risk,
  governanceEvents,
  whaleEvents,
  signals,
  tokenSymbol,
  commitActivityPromise,
  tvlHistoryPromise,
  transfersPromise,
  releasesPromise,
}: ProfileTimelineAsyncProps) {
  const commitResult = use(commitActivityPromise);
  const tvlHistoryResult = use(tvlHistoryPromise);
  const transfersResult = use(transfersPromise);
  const releasesResult = use(releasesPromise);

  const commitActivity = commitResult?.ok ? commitResult.data : null;
  const tvlHistory = tvlHistoryResult?.ok ? tvlHistoryResult.data : null;
  const tokenTransfers = transfersResult?.ok ? transfersResult.data : null;
  const releases = releasesResult?.ok ? releasesResult.data : null;

  const resolvedGithub: GithubIntel = {
    ...github,
    commitsLast7d: commitActivity?.commitsLast7d ?? null,
    commitsPrev7d: commitActivity?.commitsPrev7d ?? null,
    commitTrendPct: commitActivity?.trendPct ?? null,
  };

  const resolvedTvl: Tvl | null = tvl
    ? { ...tvl, changePct7d: changePctOverDays(tvlHistory, 7), changePct30d: changePctOverDays(tvlHistory, 30) }
    : null;

  const events = buildProjectTimeline({
    github: resolvedGithub,
    governanceEvents,
    whaleEvents,
    signals,
    tvl: resolvedTvl,
    risk,
    tokenTransfers,
    tokenSymbol,
    releases,
  });

  return <ProfileTimeline events={events} />;
}
