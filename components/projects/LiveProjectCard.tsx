/**
 * PR-057 — the one `LiveProject` card, used everywhere on the new Projects
 * page (every curated rail plus the Full Directory) — per PR-055 §7's
 * two-variant spec, distinguished by `project.source` rather than being two
 * unrelated components. No card-rendering logic is duplicated anywhere else
 * on this page.
 *
 * PR-059 — Task 3/8/10: a second axis of variation — `variant`, not
 * `source` — controls *density* (`"detailed"` for the Full Directory,
 * `"compact"` for every curated rail), orthogonal to the existing
 * registry-vs-discovery distinction. One component, two independent
 * variant dimensions, never a forked/duplicated card. Within `"detailed"`,
 * information hierarchy now reads name → verification → primary metric +
 * confidence (promoted, emphasized) → chain/category (demoted) → secondary
 * metrics (quieter, `bare`) → freshness — the exact order Task 8 asks
 * for. `"compact"` keeps only the five elements Task 3 names: logo, name,
 * verification, primary metric, confidence.
 *
 * PR-061 — Task 8: the detailed card now also answers "why should I care?"
 * via `ecosystemRoleTag()` — one short, deterministic phrase picked from
 * real, already-present fields (verification, governance, engineering
 * activity, confidence) in a fixed priority order, never an AI-generated
 * summary or invented ranking. It replaces the old, taller two-row
 * `ProjectCategoryChips` block (which reserved 50px regardless of content)
 * with a single line combining that tag and the project's category — a net
 * height *reduction* that still surfaces trust/ecosystem-role signal, per
 * Task 8's "without increasing card height significantly."
 *
 * A Server Component throughout — `next/link`, `ProjectLogo`, and
 * `WatchButton` all compose fine without this file itself needing
 * `"use client"`.
 */

import Link from "next/link";

import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ScoreBadge } from "@/components/explorer/ScoreBadge";
import { MetricItem } from "@/components/explorer/MetricItem";
import { Timestamp } from "@/components/explorer/Timestamp";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { WatchButton } from "@/components/watchlists/WatchButton";
import type { ProjectCategory } from "@/data/projects/enums";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { formatCompactCurrency, formatCompactNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { LiveProject } from "@/lib/projects/types";

export type LiveProjectCardVariant = "detailed" | "compact";

type LiveProjectCardProps = {
  project: LiveProject;
  /** `"detailed"` (default) is the Full Directory's card; `"compact"` is curated-rails-only. Never a second component — see this file's own doc comment. */
  variant?: LiveProjectCardVariant;
  className?: string;
};

type PrimaryMetric = { label: string; value?: string; changePct24h?: number | null };

/**
 * PR-071 Round 3 — Task 8: which real metric is *most meaningful* differs
 * by category — a Lending market's headline number is what it holds (TVL),
 * a DEX's is trading activity (Volume), a Stablecoin/Infrastructure/AI
 * token's identity is its supply value (Market Cap; this card's `LiveProject`
 * model has no `fullyDilutedValuationUsd` field — that only exists on the
 * deeper Project Profile page's intelligence data — so Market Cap is the
 * closest real number already available here). Every other category keeps
 * the general Price-first chain below; this table only overrides the
 * *order*, never fabricates a number a project doesn't actually have.
 *
 * PR-071 Round 4 — Task 6: added Bridge → Volume (a bridge's headline
 * number is throughput, exactly like a DEX's — real field, same rule).
 * Two categories from the brief's own examples are deliberately NOT
 * mapped: Oracle → "Integrations" and Gaming → "Users" have no
 * corresponding field anywhere in `LiveProject`/`MarketSummary` — no
 * provider this app integrates surfaces an oracle's consumer count or a
 * game's active-user count today. Adding them would mean inventing a
 * number, which breaks this whole page's "every figure is real,
 * registry- or provider-derived" rule (`build.ts`'s own governing
 * principle since PR-061). Both categories keep the general chain below
 * instead — honest, not most-relevant-in-theory.
 */
const CATEGORY_PRIMARY_METRIC: Partial<Record<ProjectCategory, "tvl" | "volume" | "marketCap">> = {
  lending: "tvl",
  dex: "volume",
  bridge: "volume",
  stablecoin: "marketCap",
  infrastructure: "marketCap",
  ai: "marketCap",
};

/** Category preference first (when that project actually has the number) → Price → Market Cap → TVL, first real one wins; never two empty dashes side by side when a project genuinely has no market read at all. Price carries its real 24h change alongside it when available — the other fallbacks have no 24h figure of their own to attach. */
function primaryMetric(project: LiveProject): PrimaryMetric {
  const { market } = project;
  const preferred = CATEGORY_PRIMARY_METRIC[project.category];
  if (preferred === "tvl" && market.tvlUsd !== null) {
    return { label: "TVL", value: formatCompactCurrency(market.tvlUsd) };
  }
  if (preferred === "volume" && market.volume24hUsd !== null) {
    return { label: "Volume 24h", value: formatCompactCurrency(market.volume24hUsd) };
  }
  if (preferred === "marketCap" && market.marketCapUsd !== null) {
    return { label: "Market Cap", value: formatCompactCurrency(market.marketCapUsd) };
  }
  if (market.available && market.priceUsd !== null) {
    return { label: "Price", value: formatCompactCurrency(market.priceUsd), changePct24h: market.changePct24h };
  }
  if (market.marketCapUsd !== null) return { label: "Market Cap", value: formatCompactCurrency(market.marketCapUsd) };
  if (market.tvlUsd !== null) return { label: "TVL", value: formatCompactCurrency(market.tvlUsd) };
  return { label: "Market" };
}

/**
 * PR-061 — Task 8: "why should I care?" in one short, deterministic phrase.
 * Every branch reads a real, already-present field — never an invented
 * ranking or generated summary. Priority order: an established, well-
 * capitalized project first, then real signs of current activity
 * (governance, engineering), then confidence, then honestly falling back to
 * "Newly discovered" for a standalone Discovery candidate with none of the
 * above yet — never a blank line.
 */
function ecosystemRoleTag(project: LiveProject): string {
  const { verification, governance, engineering, confidence, market } = project;
  if (verification.status === "verified" && (market.tvlUsd ?? 0) > 100_000_000) return "Blue-chip, verified";
  if (verification.status === "verified") return "Editorially verified";
  if (governance.configured && (governance.activeProposalCount ?? 0) > 0) return "Active governance";
  if (engineering.commitsLast7d !== null && engineering.commitsLast7d > 0) return "Actively developed";
  if (confidence.level === "high") return "High confidence";
  if (project.source === "discovery") return "Newly discovered";
  return "Tracked project";
}

export function LiveProjectCard({ project, variant = "detailed", className }: LiveProjectCardProps) {
  const isDiscoveryOnly = project.source === "discovery";
  const isCompact = variant === "compact";
  const { identity, confidence, chains, verification, engineering, market } = project;

  const metric = primaryMetric(project);
  // Each secondary tile only when it isn't already the primary metric (never show the same number twice) AND has a real value — Task 8: never stack multiple "Not Tracked" placeholders, omit the tile entirely instead.
  const tvlValue = market.tvlUsd !== null && metric.label !== "TVL" ? formatCompactCurrency(market.tvlUsd) : undefined;
  const volumeValue = market.volume24hUsd !== null && metric.label !== "Volume 24h" ? formatCompactCurrency(market.volume24hUsd) : undefined;
  const activityValue = engineering.commitsLast7d !== null ? formatCompactNumber(engineering.commitsLast7d) : undefined;
  const hasSecondaryMetrics = tvlValue !== undefined || volumeValue !== undefined || activityValue !== undefined;
  const showChange = !isCompact && metric.changePct24h !== undefined;

  const verificationRow = (
    <div className={cn("flex flex-wrap items-center gap-1.5", !isCompact && "min-h-[26px]")}>
      {isDiscoveryOnly ? (
        <GlowBadge color="muted">Discovered</GlowBadge>
      ) : (
        verification.status && <VerificationBadge status={verification.status} compact={isCompact} />
      )}
    </div>
  );

  const cardBody = (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-gradient-to-b from-radar-light-card/90 to-radar-light-surface/70 shadow-[0_1px_2px_rgba(16,34,58,0.04)] backdrop-blur-xl transition-[border-color,box-shadow] duration-200 dark:bg-gradient-to-b dark:from-radar-elevated/60 dark:to-radar-card/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        isCompact ? "gap-3 p-4" : "gap-3.5 p-5",
        isDiscoveryOnly
          ? "border-dashed border-radar-light-border/80 dark:border-white/15"
          : "border-radar-light-border hover:border-radar-primary/30 hover:shadow-[0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.12)] dark:border-radar-border dark:hover:border-radar-border-hover dark:hover:shadow-[0_0_50px_-15px_rgba(var(--color-radar-primary-rgb),0.15)]",
        className
      )}
    >
      {/* 1. Name — always the card's most prominent line. */}
      <div className="flex items-center gap-2.5">
        <ProjectLogo logoUrl={identity.logoUrl} fallbackUrls={identity.logoUrlFallbacks} name={identity.name} size={isCompact ? 32 : 40} />
        <span
          title={identity.name}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          {identity.name}
        </span>
        {/* Watching requires a stable registry project id — never offered on a discovery-only card, per PR-055 §7. */}
        {!isDiscoveryOnly && <WatchButton projectId={project.id} projectName={identity.name} size="sm" className="-my-1" />}
      </div>

      {/* 2. Verification. */}
      {verificationRow}

      {/* 3 & 4. Primary metric (+ its real 24h change, when it's Price) + Confidence — promoted above chain/category so they're impossible to miss, matching Task 8's priority order. */}
      <div className={cn("grid gap-2", showChange ? "grid-cols-3" : "grid-cols-2")}>
        <MetricItem label={metric.label} value={metric.value} unavailableLabel="Not Tracked" emphasize={!isCompact} bare={isCompact} />
        {showChange && <MetricItem label="24h" changeValue={metric.changePct24h} />}
        <ScoreBadge
          type="confidence"
          score={confidence.score}
          label={confidence.level}
          showLabel={!isCompact}
          bare={isCompact}
        />
      </div>

      {!isCompact && (
        <>
          {/* Chain + Category — both real registry facts, together forming one quick "what/where is this" line, one step down from the primary metric/confidence above. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <ChainBadgeGroup chains={chains} size="sm" max={1} className="flex-nowrap" />
            <span className="flex items-center gap-1 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted">
              {CATEGORY_BRANDING[project.category].label}
            </span>
          </div>

          {/* Why it matters — one deterministic phrase, real fields only, never an invented ranking. */}
          <p className="truncate text-[11px] font-medium text-radar-primary">{ecosystemRoleTag(project)}</p>

          {/* Secondary metrics — same real numbers as before, just visually quieter (`bare`, no boxed tile) so they read as supporting detail, not competing with the primary metric/confidence above. PR-071 Round 3 — Task 8: each tile only renders when it has a real value; a project with nothing left to show here (already covered by the primary metric) skips the row entirely rather than stacking several "Not Tracked" placeholders. Grouped with the timestamp so the bottom of the card stays aligned whether or not this row renders. */}
          <div className="mt-auto flex flex-col gap-2">
            {hasSecondaryMetrics && (
              <div className="flex items-center gap-4 border-t border-radar-light-border/60 pt-3 dark:border-white/[0.06]">
                {tvlValue !== undefined && <MetricItem label="TVL" value={tvlValue} bare />}
                {volumeValue !== undefined && <MetricItem label="Volume 24h" value={volumeValue} bare />}
                {activityValue !== undefined && <MetricItem label="GitHub Activity" value={activityValue} bare />}
              </div>
            )}
            <div className="text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/50">
              <Timestamp iso={project.lastUpdated} />
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Discovery-only projects have `slug: null` — no Project Profile route
  // exists for them yet (PR-055 §7's open question, deliberately deferred).
  // Never link to a fabricated or 404 destination.
  if (!project.slug) return cardBody;

  return (
    <Link
      href={`/dashboard/projects/${project.slug}`}
      className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
    >
      {cardBody}
    </Link>
  );
}
