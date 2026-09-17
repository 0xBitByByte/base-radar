import { ExternalLink } from "lucide-react";

import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatCompactCurrency, formatPercent, formatRelativeTime } from "@/lib/data/format";
import { formatDexName, getPairLabel, getPoolClassification, getPoolStatus } from "@/components/explorer/pairIntelligenceHelpers";
import { TokenPairCluster } from "@/components/explorer/TokenPairCluster";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { cn } from "@/lib/utils";
import type { TradingPool } from "@/lib/intelligence/types";

type PairCardProps = {
  pool: TradingPool;
  /** This project's own real token image (`market.imageUrl`), threaded down from the page via `ProfilePairIntelligence`/`PoolExplorerList` — the base-token half of the overlapping pair icon. Omitted/`null` falls back to `tokenLogos`, then `TokenLogo`'s own honest initials badge — never a fabricated image. */
  tokenLogoUrl?: string | null;
  /** Token Logo System — one canonical resolved logo per token in this pool, keyed by both lowercased contract address and uppercased symbol (`resolveTokenLogosForPools()`, `lib/branding/resolveTokenLogo.ts`) — the same URL every page resolves for a given symbol, never a different valid image depending on which page asked. Used for the secondary/quote token (which has no other logo source), and as a fallback for the primary token if `tokenLogoUrl` wasn't resolved. */
  tokenLogos?: Record<string, string>;
  /** Computed once by the parent (one sort over the whole array) and compared by reference here — never re-derived per card. */
  isTopVolume: boolean;
  /** This pool's share of total liquidity across all matched pools, computed once by the parent. `null` when there's nothing real to divide by. */
  sharePct: number | null;
};

/** Token Logo System — looks up a token's one canonical resolved logo by address first (collision-safe), symbol second, from the page-level `tokenLogos` map. */
function lookupTokenLogo(tokenLogos: Record<string, string> | undefined, address: string | null, symbol: string | null): string | null {
  if (!tokenLogos) return null;
  const byAddress = address ? tokenLogos[address.toLowerCase()] : undefined;
  if (byAddress) return byAddress;
  const bySymbol = symbol ? tokenLogos[symbol.toUpperCase()] : undefined;
  return bySymbol ?? null;
}

/** Row 3's shared "small label, larger value" cell — the same label-over-value recipe `ProfileKeySignals.tsx`'s `HelperStat` already established elsewhere on this page, sized for this card's three-equal-column layout rather than a free-flowing stack. PR-086 typography audit — label size aligned from `text-[11px]` to `text-[10.5px]`, the established uppercase-eyebrow-label size used everywhere else on this page (`MetricItem`, `ScorecardCardView`, `ProfileSources`'s section labels) — a real, confirmed size mismatch, not a stylistic choice. PR-088 — `tabular-nums` added: this row's two numeric-shaped values (Age, Share) sit beside a text one (DEX) in a fixed three-column grid, and every other numeric display on this page (Liquidity/24H Volume above, `MetricItem`, `ChangeValue`) already reserves fixed-width digits — this cell alone didn't, so its column could visibly shift narrower/wider as its value refreshed while its neighbors held still. */
function SupportingMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
      <span className="truncate text-sm font-medium tabular-nums text-radar-light-text dark:text-radar-white">{value}</span>
    </div>
  );
}

/**
 * One pool, one self-contained dashboard card — mirrors `GovernanceList.tsx`'s
 * stacked-card recipe (`rounded-xl border ...`), not a table row. Five rows,
 * largest-to-smallest, each its own section using the same label/value
 * pattern already established elsewhere on this page — a future stage's
 * APR/Rewards/Fee-Tier fields slot in as one more row in that same pattern,
 * not a restructure.
 *
 * PR-085.xx — premium dashboard redesign per the approved mockup. Row 1
 * (identity): overlapping base/quote token icons — the base icon reuses
 * this project's own already-fetched `market.imageUrl`; the quote token's
 * real image (previously unavailable anywhere in this codebase's data
 * model) now comes from the Token Logo System's canonical, address/known-
 * symbol resolution (`tokenLogos`, see `lib/branding/resolveTokenLogo.ts`)
 * when a match exists, honestly falling to `TokenLogo`'s existing
 * symbol-initials fallback rather than a fabricated one. Row 2 (Liquidity/
 * 24H Volume) is now an explicit equal-width 2-column grid at `text-xl`, the
 * card's single largest, most dominant values. Row 3 (DEX/Age/Share) is now
 * three equal, independently-scannable label+value cells instead of one
 * flat sentence — the mockup's own explicit "Do NOT render these as one long
 * sentence" requirement. Row 4/5 (assessment + actions) unchanged in
 * substance, typography only.
 *
 * One deliberate, evidence-based deviation from the mockup: the small DEX
 * icon shown next to "Aerodrome"/"Uniswap"/"PancakeSwap" in the reference
 * image has no real backing data anywhere in this codebase — there is no
 * `dexId` → logo mapping, no fetched DEX-logo field, and no existing icon
 * asset for any DEX (confirmed: no match anywhere under `lib/branding/` or
 * `public/`). Every other icon this app renders traces to a real, fetched,
 * or registry-configured URL; inventing a hardcoded icon for a fixed guess
 * at "the DEXes we'll probably see" would be exactly the kind of fabricated
 * image the brief explicitly prohibits. DEX stays text-only until a real
 * source for that icon exists.
 */
export function PairCard({ pool, tokenLogoUrl = null, tokenLogos, isTopVolume, sharePct }: PairCardProps) {
  const status = getPoolStatus(pool);
  const classification = getPoolClassification(pool);
  const ageLabel = pool.pairCreatedAt !== null ? formatRelativeTime(new Date(pool.pairCreatedAt).toISOString()).replace(/ ago$/, "") : "—";

  const primaryLogoUrl = tokenLogoUrl ?? lookupTokenLogo(tokenLogos, pool.baseTokenAddress, pool.baseTokenSymbol);
  const secondaryLogoUrl = lookupTokenLogo(tokenLogos, pool.quoteTokenAddress, pool.quoteTokenSymbol);

  return (
    // PR-085.xx premium hover polish — the same shared motion language this
    // pass applies to every interactive card on this page (see
    // `ProfileSources.tsx`'s `SourceCard` for the identical values): a
    // 2px lift, a soft primary-tinted shadow, a brightened border, and a
    // `duration-300 ease-out` transition. No Link-behind-content trick
    // needed here (unlike `LiveProjectCard`) — this card's own real
    // interactive elements (Copy/External Link) sit inside it, so a plain
    // `hover:` is correct, not `peer-hover:`.
    <li
      className={cn(
        "group flex flex-col gap-2 p-3 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-radar-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(var(--color-radar-primary-rgb),0.18)] motion-reduce:hover:translate-y-0 dark:hover:border-white/25",
        GLASS_TILE_SURFACE
      )}
    >
      {/* Row 1 — identity: overlapping base/quote token icons, the pair itself, and Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          {/* PR-090 — extracted into `TokenPairCluster`, the one shared
              cluster every pair-of-tokens surface in this app now renders
              through (see that file's own doc comment for the full overlap
              history/math: 32px primary, 28px secondary, 86% of the
              secondary visible). `group-hover:scale-[1.04]` still comes
              from this `<li>`'s own `group` class, unchanged. */}
          <TokenPairCluster
            primaryLogoUrl={primaryLogoUrl}
            primarySymbol={pool.baseTokenSymbol}
            secondaryLogoUrl={secondaryLogoUrl}
            secondarySymbol={pool.quoteTokenSymbol}
          />
          <span className="min-w-0 truncate text-base font-semibold text-radar-light-text dark:text-radar-white">{getPairLabel(pool)}</span>
        </div>
        <GlowBadge color={status.color} className="shrink-0 px-2 py-0.5 text-[11px]">
          {status.label}
        </GlowBadge>
      </div>

      {/* Row 2 — Liquidity / 24H Volume: exactly two equal-width blocks, the card's most dominant values */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Liquidity</span>
          <span className="truncate text-xl font-bold tabular-nums text-radar-light-text dark:text-radar-white">
            {pool.liquidityUsd !== null ? formatCompactCurrency(pool.liquidityUsd) : "—"}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">24H Volume</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xl font-bold tabular-nums text-radar-light-text dark:text-radar-white">
              {pool.volume24hUsd !== null ? formatCompactCurrency(pool.volume24hUsd) : "—"}
            </span>
            {isTopVolume && (
              <GlowBadge color="primary" className="shrink-0 px-1.5 py-0.5 text-[9px]">
                Top
              </GlowBadge>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 — DEX / Pool Age / Liquidity Share: three equal, independently-scannable cells, not one sentence. */}
      <div className="grid grid-cols-3 gap-2 border-t border-radar-light-border pt-2 dark:border-white/10">
        <SupportingMetric label="DEX" value={formatDexName(pool.dexId)} />
        <SupportingMetric label="Age" value={ageLabel} />
        <SupportingMetric label="Share" value={sharePct !== null ? formatPercent(sharePct, { showSign: false }) : "—"} />
      </div>

      {/* Row 4/5 — smallest: Base Radar's own read + real-data-only actions, quietly in the corner */}
      <div className="flex items-center justify-between gap-3 border-t border-radar-light-border pt-2 dark:border-white/10">
        <span className="text-xs font-medium text-radar-primary dark:text-radar-accent">Base Radar: {classification.label}</span>
        <div className="flex shrink-0 items-center gap-2">
          {pool.pairAddress && <CopyButton value={pool.pairAddress} label="pool contract address" />}
          {pool.url && (
            <a
              href={pool.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on DexScreener"
              // PR-085.xx premium polish — a real circular hit-target
              // (matching `ProfileIconLink`'s established icon-button
              // recipe elsewhere on this page) instead of a bare icon
              // floating with no visual affordance that it's clickable.
              className="flex size-6 items-center justify-center rounded-full text-radar-light-muted/70 outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:bg-radar-light-surface focus-visible:text-radar-light-text dark:text-radar-muted/60 dark:hover:bg-white/5 dark:hover:text-radar-white dark:focus-visible:bg-white/5 dark:focus-visible:text-radar-white"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
