import { Suspense } from "react";
import { Activity } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { ProfileTimelineAsync } from "@/components/explorer/ProfileTimelineAsync";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import type { GithubIntel, Risk, Tvl } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance";
import type { WhaleEvent } from "@/lib/whale/types";
import type { Signal } from "@/lib/data/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { CommitActivity, ReleaseSummary } from "@/lib/providers/github/service";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileActivityFeedProps = {
  github: GithubIntel;
  tvl: Tvl;
  risk: Risk;
  governance: GovernanceEvent[] | null;
  whaleEvents: WhaleEvent[];
  signals: Signal[];
  tokenSymbol: string | null;
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  tvlHistoryPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
  transfersPromise: Promise<ProviderResult<TokenTransfer[]> | null>;
  releasesPromise: Promise<ProviderResult<ReleaseSummary[]> | null>;
};

/**
 * PR13.3 Goal 6 — the "Activity Feed" card, extracted out of
 * `ProfileIntelligence` (which used to render it as its last sub-card,
 * between "AI Intelligence" and "Governance") into its own top-level
 * section, so the Timeline it wraps (`ProfileTimelineAsync` →
 * `ProfileTimeline`, both unchanged) can be the final section in the page's
 * mandated linear order. No content, data, or streaming behavior changed —
 * this is the exact same `<Suspense>` boundary and card copy
 * `ProfileIntelligence` already rendered, just moved to its own component.
 */
export function ProfileActivityFeed({
  github,
  tvl,
  risk,
  governance,
  whaleEvents,
  signals,
  tokenSymbol,
  commitActivityPromise,
  tvlHistoryPromise,
  transfersPromise,
  releasesPromise,
}: ProfileActivityFeedProps) {
  return (
    <ProfileSectionCard title="Activity Feed" icon={Activity} className="gap-5">
      <p className="text-xs text-radar-light-muted dark:text-radar-muted">
        Whale transfers, governance, GitHub releases and commits, TVL swings, risk alerts, and signals, merged into one
        newest-first feed — no event type shown twice.
      </p>
      <Suspense fallback={<WidgetSkeleton className="h-48 rounded-xl" />}>
        <ProfileTimelineAsync
          github={github}
          tvl={tvl}
          risk={risk}
          governanceEvents={governance ?? []}
          whaleEvents={whaleEvents}
          signals={signals}
          tokenSymbol={tokenSymbol}
          commitActivityPromise={commitActivityPromise}
          tvlHistoryPromise={tvlHistoryPromise}
          transfersPromise={transfersPromise}
          releasesPromise={releasesPromise}
        />
      </Suspense>
    </ProfileSectionCard>
  );
}
