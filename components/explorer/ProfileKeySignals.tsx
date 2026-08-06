"use client";

import { Activity, ArrowUpRight, Landmark, TrendingUp, Trophy } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { ExpandableMetricCard } from "@/components/ui/ExpandableMetricCard";
import { formatCompactCurrency } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { Market } from "@/lib/intelligence/types";
import type { WhaleEvent } from "@/lib/whale/types";

type CategoryRank = { rank: number; totalInCategory: number };

type ProfileKeySignalsProps = {
  market: Market;
  /** Registry category label (e.g. "Lending") — `null` when this project has no primary category. */
  categoryLabel: string | null;
  /** Same real, already-computed TVL rank `ProfileHeader`'s hero one-liner and `report.ts`'s highlights read — reused, never a second ranking pass. */
  categoryTvlLeadership: CategoryRank | null;
  /** PR-083 — same category peer set as `categoryTvlLeadership`, re-sorted by market cap instead of TVL (`page.tsx`, zero new fetch). `null` when this project itself has no real market cap. */
  categoryMarketCapLeadership: CategoryRank | null;
  /** PR-083 — same TVL sort, unfiltered by category — this project's rank among every Base project `page.tsx`'s Live Projects Service tracks with real TVL. */
  baseEcosystemTvlLeadership: CategoryRank | null;
  /** `null` means no governance source is configured for this project. */
  governance: GovernanceEvent[] | null;
  /** PR-075 — `"on-chain"`/`"forum"`/`"none"` mean `governance === null` is a real, confirmed governance mechanism, not a registry gap. See `ProfileGovernance`'s identical distinction. */
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null;
  /** PR-083 — computed in `page.tsx` (a Server Component), not here: this component is a Client Component, and computing this needs `Date.now()`, which components must not call impurely during render. Zero-fetch aggregate over the same `governance` array. */
  governancePassed30d: number;
  /** PR-083 — real quorum-reached rate from `GovernanceEvent.quorumMet`, computed in `page.tsx`. `null` when no tracked proposal has a real quorum reading yet. */
  governanceQuorumPct: number | null;
  /** Already filtered to this project by `page.tsx`. */
  whaleEvents: WhaleEvent[];
};

/** Mirrors `ProfileGovernance`'s `GOVERNANCE_TYPE_EMPTY_STATE` — same three real, confirmed-mechanism reasons, condensed to a tile label + tooltip. */
const GOVERNANCE_TYPE_TILE: Record<"on-chain" | "forum" | "none", { label: string; reason: string }> = {
  "on-chain": { label: "On-chain Voting", reason: "This project governs itself through on-chain voting, not Snapshot — Base Radar doesn't currently track on-chain proposal activity." },
  forum: { label: "Forum Governance", reason: "This project governs itself through forum discussion, not Snapshot — Base Radar doesn't currently track forum activity." },
  none: { label: "No Governance", reason: "This project is confirmed to have no governance mechanism." },
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-radar-light-text dark:text-radar-white">{children}</span>
    </div>
  );
}

/** PR-083A — one stat inside a `NavigateTile`'s `helper` stack: its own muted label line, then its own bolder value line directly below — every real number gets to stand on its own instead of being packed onto a shared line with its neighbors. */
function HelperStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-0">
      <span className="text-radar-light-muted/80 dark:text-radar-muted/70">{label}</span>
      <span className="font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
    </span>
  );
}

/**
 * UX polish pass, Sections 5/6 — smooth-scrolls to a real section id already
 * on the page and briefly rings it, so clicking Governance/Whale Activity
 * takes the reader to the actual full section instead of duplicating its
 * content inline. The ring is added/removed via plain class toggles (no
 * external animation library, matches this codebase's existing
 * `motion-reduce`-aware conventions) and always cleaned up, even if the
 * element is unmounted before the timeout fires.
 */
function scrollToAndHighlight(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  el.classList.add("ring-2", "ring-radar-primary/50", "dark:ring-radar-accent/50");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-radar-primary/50", "dark:ring-radar-accent/50");
  }, 1600);
}

/**
 * UX polish pass, Sections 5/6 — the non-expanding counterpart to
 * `ExpandableMetricCard`: same collapsed-tile look and hover treatment, but
 * clicking navigates to a real section instead of opening inline detail.
 * Used only where the full, real detail already has its own section
 * elsewhere on the page (Governance, Whale Activity) — duplicating that
 * content inline would just be a second copy of the same data.
 */
function NavigateTile({
  icon,
  label,
  value,
  helper,
  unavailable,
  targetId,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** PR-083 addendum — a small muted stack of supporting real numbers below `value` (mirrors `ExpandableMetricCard`'s own `helper` slot, same visual language), so this tile reads as one primary number plus context rather than several numbers packed into one line. */
  helper?: React.ReactNode;
  unavailable?: boolean;
  targetId: string;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToAndHighlight(targetId)}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 text-left shadow-sm transition-[box-shadow,transform] duration-150 ease-out outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/[0.02]",
        unavailable && "opacity-70"
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          {icon}
          {label}
        </span>
        <ArrowUpRight className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "truncate text-base font-bold tabular-nums text-radar-light-text dark:text-radar-white",
          unavailable && "text-radar-light-muted dark:text-radar-muted"
        )}
      >
        {value}
      </span>
      {helper && <div className="flex flex-col gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">{helper}</div>}
    </button>
  );
}

/**
 * PR-073 refinement pass — "Key Signals": a concise, four-tile strip
 * surfacing real signals that today only exist deep in the page.
 *
 * UX polish pass — Category Rank and 7D Momentum stay expandable in place
 * (`ExpandableMetricCard`): their full detail has no other home on the
 * page. Governance Activity and Whale Activity no longer expand inline —
 * both already have a real, full section elsewhere (`#governance`, and
 * whale transfers inside the Activity/`#timeline` feed), so clicking them
 * now smooth-scrolls to that section and briefly highlights it instead of
 * showing a second copy of the same data (`NavigateTile`).
 *
 * No new fetch, no new derivation — every value here is a field `page.tsx`
 * already computes for the Header/Governance/Activity Feed sections.
 */
export function ProfileKeySignals({
  market,
  categoryLabel,
  categoryTvlLeadership,
  categoryMarketCapLeadership,
  baseEcosystemTvlLeadership,
  governance,
  governanceType,
  governancePassed30d,
  governanceQuorumPct,
  whaleEvents,
}: ProfileKeySignalsProps) {
  const activeProposals = governance?.filter((event) => event.status === "active").length ?? null;
  const momentumAvailable = market.available && market.changePct7d !== null;
  const confirmedGovernanceType = governance === null && (governanceType === "on-chain" || governanceType === "forum" || governanceType === "none") ? governanceType : null;

  // PR-083 — a deterministic label off the same `changePct7d` already shown
  // above (`>0` "Bullish", `<0` "Bearish", `=0` "Neutral") — a direct
  // rewording of a real number already on screen, never a new metric or a
  // subjective score.
  const momentumTrend = momentumAvailable
    ? market.changePct7d! > 0
      ? "Bullish"
      : market.changePct7d! < 0
        ? "Bearish"
        : "Neutral"
    : null;

  // PR-083 addendum — Governance Activity: `value` stays the single most
  // important number (Active), with a small muted `helper` stack below for
  // Passed/Quorum/Failed instead of packing everything into one line.
  // `governancePassed30d`/`governanceQuorumPct` are computed in `page.tsx`
  // (this is a Client Component and can't call `Date.now()` during render).
  const governanceValue = confirmedGovernanceType
    ? GOVERNANCE_TYPE_TILE[confirmedGovernanceType].label
    : governance === null
      ? "Not Configured"
      : `${activeProposals} Active`;
  // PR-083A — each real stat gets its own label line + value line (via
  // `HelperStat`) instead of sharing a line with its neighbors.
  const governanceFailed = governance?.filter((event) => event.status === "failed").length ?? 0;
  const governanceHelper =
    governance !== null && governance.length > 0 ? (
      <>
        <HelperStat label="Passed (30D)" value={governancePassed30d} />
        {governanceQuorumPct !== null && <HelperStat label="Quorum Rate" value={`${governanceQuorumPct}%`} />}
        {governanceFailed > 0 && <HelperStat label="Failed" value={governanceFailed} />}
      </>
    ) : undefined;

  // PR-083 addendum — Whale Activity: `value` stays the count, `helper`
  // stacks Largest Transfer/Cumulative Value below it — both real,
  // zero-fetch aggregates over the already-passed `whaleEvents` array.
  // PR-083A — "Cumulative Value" (not "Total"/"24H Total": the underlying
  // whale-detection pipeline has no actual time-window filter, so a "24H"
  // qualifier would misstate what this real number actually covers).
  const largestWhaleTransferUsd = whaleEvents.length > 0 ? Math.max(...whaleEvents.map((event) => event.usdValue)) : null;
  const totalWhaleVolumeUsd = whaleEvents.length > 0 ? whaleEvents.reduce((sum, event) => sum + event.usdValue, 0) : null;
  const whaleValue = whaleEvents.length > 0 ? `${whaleEvents.length} Recent` : "None Detected";
  const whaleHelper =
    largestWhaleTransferUsd !== null && totalWhaleVolumeUsd !== null ? (
      <>
        <HelperStat label="Largest Transfer" value={formatCompactCurrency(largestWhaleTransferUsd)} />
        <HelperStat label="Cumulative Value" value={formatCompactCurrency(totalWhaleVolumeUsd)} />
      </>
    ) : undefined;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <ExpandableMetricCard
        id="key-signal-category-rank"
        icon={<Trophy className="size-3 shrink-0" aria-hidden="true" />}
        label="Category Rank"
        defaultExpanded
        unavailable={!categoryTvlLeadership || !categoryLabel}
        value={categoryTvlLeadership && categoryLabel ? `#${categoryTvlLeadership.rank} of ${categoryTvlLeadership.totalInCategory}` : "Not Ranked"}
        sourceLabel="Base Radar / CoinGecko"
        expandedContent={
          <>
            <DetailRow label={categoryLabel ? `${categoryLabel} rank (by TVL)` : "Category rank (by TVL)"}>
              {categoryTvlLeadership ? `#${categoryTvlLeadership.rank} of ${categoryTvlLeadership.totalInCategory}` : "Not Ranked"}
            </DetailRow>
            <DetailRow label={categoryLabel ? `${categoryLabel} rank (by market cap)` : "Category rank (by market cap)"}>
              {categoryMarketCapLeadership ? `#${categoryMarketCapLeadership.rank} of ${categoryMarketCapLeadership.totalInCategory}` : "Not Ranked"}
            </DetailRow>
            <DetailRow label="Base ecosystem rank (by TVL)">
              {baseEcosystemTvlLeadership ? `#${baseEcosystemTvlLeadership.rank} of ${baseEcosystemTvlLeadership.totalInCategory}` : "Not Ranked"}
            </DetailRow>
            <DetailRow label="Global market cap rank">{market.marketCapRank !== null ? `#${market.marketCapRank}` : "Not Tracked"}</DetailRow>
          </>
        }
      />

      <ExpandableMetricCard
        id="key-signal-momentum"
        icon={<TrendingUp className="size-3 shrink-0" aria-hidden="true" />}
        label="7D Momentum"
        defaultExpanded
        unavailable={!momentumAvailable}
        value={momentumAvailable ? <ChangeValue value={market.changePct7d} className="text-sm" /> : "Not Tracked"}
        sourceLabel="CoinGecko"
        expandedContent={
          <>
            <DetailRow label="24h Change">{market.available && market.changePct24h !== null ? <ChangeValue value={market.changePct24h} className="text-xs" /> : "Not Tracked"}</DetailRow>
            <DetailRow label="7d Change">{momentumAvailable ? <ChangeValue value={market.changePct7d} className="text-xs" /> : "Not Tracked"}</DetailRow>
            <DetailRow label="30d Change">{market.available && market.changePct30d !== null ? <ChangeValue value={market.changePct30d} className="text-xs" /> : "Not Tracked"}</DetailRow>
            <DetailRow label="Trend">{momentumTrend ?? "Not Tracked"}</DetailRow>
          </>
        }
      />

      <NavigateTile
        icon={<Landmark className="size-3 shrink-0" aria-hidden="true" />}
        label="Governance Activity"
        unavailable={governance === null && confirmedGovernanceType === null}
        value={governanceValue}
        helper={governanceHelper}
        targetId="governance"
      />

      <NavigateTile
        icon={<Activity className="size-3 shrink-0" aria-hidden="true" />}
        label="Whale Activity"
        value={whaleValue}
        helper={whaleHelper}
        targetId="timeline"
      />
    </div>
  );
}
