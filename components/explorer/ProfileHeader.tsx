import { ExternalLink } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { SocialLink } from "@/components/branding/SocialLink";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { ProfileChainDisplay } from "@/components/explorer/ProfileChainDisplay";
import { ProfileQuickActions } from "@/components/explorer/ProfileQuickActions";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { getExplorerLink } from "@/lib/branding/explorerLink";
import { formatCompactCurrency, formatPrice } from "@/lib/data/format";
import type { ChainInfo, Community, Contracts, GithubIntel, Identity, Market, Tvl } from "@/lib/intelligence/types";

type ProfileHeaderProps = {
  identity: Identity;
  community: Community;
  chain: ChainInfo;
  contracts: Contracts;
  github: GithubIntel;
  market: Market;
  tvl: Tvl;
};

/** One compact "label / value" pair in the header's dense stat row — Bloomberg-terminal density, PR12.1 Req 2/6. Omitted by the caller entirely when the underlying field has no real value, rather than rendering a dash. */
function HeaderStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-radar-light-text dark:text-radar-white">{children}</span>
    </div>
  );
}

/**
 * The Project Profile's header — PR11.1 Part 1 trimmed this to identity +
 * trust + links; PR12.1 Req 2/6 added a dense Price/24h/Market Cap/TVL/
 * Rank/FDV stat row (every value already flows through
 * `ProjectIntelligence.market`/`.tvl` — no new fetch). PR12.1e Req 1
 * restructures the identity block itself: the verification badge moves to
 * its own line directly under the name (`hideAlternates` — the Hero
 * already carries enough trust context without also showing 3 dimmed
 * "not this status" icons beside it), community links move into the
 * identity cluster instead of floating on the far right, and the
 * remaining Explorer/Watchlist/Alert/Compare actions become one visually
 * secondary group. Composes the exact same primitives Quick View already
 * uses (`ProjectLogo`, `VerificationBadge`, `ProjectCategoryChips`) plus
 * the Profile-only `ProfileChainDisplay` (PR12.1 Req 9). The Explorer
 * action (PR11.3) delegates to `getExplorerLink` — a verified-contract/
 * token/website/homepage priority chain scoped to `chain.primaryChain`.
 */
export function ProfileHeader({ identity, community, chain, contracts, github, market, tvl }: ProfileHeaderProps) {
  const explorerLink = getExplorerLink(chain, contracts, identity);
  const githubHref = github.available && github.fullName ? `https://github.com/${github.fullName}` : null;
  const hasStats = market.available || tvl.available;

  return (
    <div className="rounded-2xl border border-radar-light-border bg-radar-light-card p-3 dark:border-white/10 dark:bg-radar-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <ProjectLogo logoUrl={identity.logoUrl} name={identity.name} size={40} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-xl font-bold tracking-tight text-radar-light-text dark:text-radar-white">
                {identity.name}
              </h1>
              {market.available && market.symbol && (
                <span className="rounded-md bg-radar-light-surface px-1.5 py-0.5 text-xs font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
                  {market.symbol}
                </span>
              )}
            </div>
            <VerificationBadge status={community.verificationStatus} compact hideAlternates className="w-fit" />
            <div className="flex flex-wrap items-center gap-1.5">
              <ProjectCategoryChips categories={identity.categories} tags={identity.tags} />
              <ProfileChainDisplay chains={chain.chains} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <SocialLink platform="website" href={identity.websiteUrl} showLabel={false} />
              {community.socials.twitter && <SocialLink platform="x" href={community.socials.twitter} showLabel={false} />}
              {community.socials.discord && <SocialLink platform="discord" href={community.socials.discord} showLabel={false} />}
              {community.socials.telegram && <SocialLink platform="telegram" href={community.socials.telegram} showLabel={false} />}
              {githubHref && <SocialLink platform="github" href={githubHref} showLabel={false} />}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 opacity-90">
          {explorerLink && (
            <Tooltip content={explorerLink.description}>
              <a
                href={explorerLink.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={explorerLink.description}
                className="flex items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Explorer
              </a>
            </Tooltip>
          )}
          <ProfileQuickActions />
        </div>
      </div>

      {hasStats && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-radar-light-border pt-2 dark:border-white/10">
          {market.available && market.priceUsd !== null && <HeaderStat label="Price">{formatPrice(market.priceUsd)}</HeaderStat>}
          {market.available && market.changePct24h !== null && (
            <HeaderStat label="24h">
              <ChangeValue value={market.changePct24h} className="text-xs" />
            </HeaderStat>
          )}
          {market.available && market.marketCapUsd !== null && (
            <HeaderStat label="Mkt Cap">{formatCompactCurrency(market.marketCapUsd)}</HeaderStat>
          )}
          {tvl.available && tvl.tvlUsd !== null && <HeaderStat label="TVL">{formatCompactCurrency(tvl.tvlUsd)}</HeaderStat>}
          {market.available && market.marketCapRank !== null && <HeaderStat label="Rank">#{market.marketCapRank}</HeaderStat>}
          {market.available && market.fullyDilutedValuationUsd !== null && (
            <HeaderStat label="FDV">{formatCompactCurrency(market.fullyDilutedValuationUsd)}</HeaderStat>
          )}
        </div>
      )}
    </div>
  );
}
