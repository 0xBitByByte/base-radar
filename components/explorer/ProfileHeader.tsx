import { Suspense, type ReactNode } from "react";
import { BarChart3, Brain, Coins, DollarSign, Droplets, ExternalLink, HeartPulse, Layers, RefreshCw, Scale, ShieldAlert, TrendingUp, Wallet } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { TokenLogo } from "@/components/branding/TokenLogo";
import { ChangeValue } from "@/components/explorer/ChangeValue";
import { ProfileChainDisplay } from "@/components/explorer/ProfileChainDisplay";
import { ProfileChart } from "@/components/explorer/ProfileChart";
import { ProfileHeaderExplorerTooltipAsync } from "@/components/explorer/ProfileHeaderExplorerTooltipAsync";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { getExplorerLink } from "@/lib/branding/explorerLink";
import { SOCIAL_BRANDING } from "@/lib/branding/socials";
import type { SocialPlatform } from "@/lib/branding/types";
import { formatCompactCurrency, formatCompactNumber, formatDate, formatPercent, formatPrice } from "@/lib/data/format";
import type { SparklinePoint } from "@/lib/data/types";
import type { ContractDetailEntry } from "@/lib/providers/blockscout/service";
import { cn } from "@/lib/utils";
import type { ProjectCategory } from "@/data/projects/enums";
import type { ChainInfo, Community, Confidence, Contracts, GithubIntel, Health, Identity, Market, Risk, Trading, Tvl } from "@/lib/intelligence/types";

type ProfileHeaderProps = {
  identity: Identity;
  community: Community;
  chain: ChainInfo;
  contracts: Contracts;
  github: GithubIntel;
  market: Market;
  /** PR-072 — carries DefiLlama's own protocol logo (`tvl.imageUrl`), the third-priority logo candidate after the registry and CoinGecko. */
  tvl: Tvl;
  /** UX polish pass — Liquidity for the header's compact stat-chip row (Price/Market Cap/TVL/Liquidity); already fetched and passed to Token & Price elsewhere on this page, reused here, not refetched. */
  trading: Trading;
  health: Health;
  confidence: Confidence;
  risk: Risk;
  /** Registry provider ids — already fetched for Token & Price / TVL sourceLinks elsewhere on this page; reused here to build the CoinGecko/DefiLlama icon links, never a new lookup. */
  coingeckoId: string | null;
  defillamaSlug: string | null;
  /**
   * PR-078B fix — the same already-fetched, per-address Blockscout lookup
   * `ProfileContracts`/`ProfileTrustCenter`/`ProfileSources` already `use()`
   * via this exact promise reference (never re-created, never re-fetched).
   * The BaseScan icon's tooltip needs this precise answer instead of the
   * fast-path `contracts.items[].verified` field — that field is driven by
   * a weak "chain-wide most-recently-verified" heuristic and was confirmed
   * live to contradict the Trust Center for the same project ("0 of 1" here
   * vs. "1 of 1" there). Only the BaseScan icon suspends on this; the rest
   * of the header still renders synchronously.
   */
  contractDetailsPromise: Promise<ContractDetailEntry[]>;
  /**
   * PR-062 Task 1 — this project's real rank by TVL among its category
   * peers, computed once in `page.tsx` via the same `lib/projects` Live
   * Projects Service `lib/intelligence/report.ts`'s `categoryTvlLeadership`
   * reuses — never a second ranking implementation. `null`/omitted falls
   * back to the registry's own `shortDescription` for the hero one-liner.
   */
  categoryTvlLeadership?: { rank: number; totalInCategory: number } | null;
  /** PR-083 addendum — the same real 7-day price series `page.tsx` already converts from `market.sparkline7d` for the Overview zone's Price chart; reused here (zero new fetch) for the Market Summary Price chip's watermark sparkline. `null` when CoinGecko returned no series. */
  priceHistory?: SparklinePoint[] | null;
};

/**
 * PR-062 Task 1 — one deterministic, registry-driven phrase per category
 * describing this project's role in the ecosystem (distinct from the plain
 * taxonomy chip `ProjectCategoryChips` already renders). A presentation
 * lookup only, same pattern as `CATEGORY_BRANDING` — never inferred or
 * generated, always traceable to the project's own real `categories[0]`.
 */
const ECOSYSTEM_ROLE_LABEL: Record<ProjectCategory, string> = {
  dex: "Decentralized Exchange",
  lending: "Lending Protocol",
  derivatives: "Derivatives Platform",
  yield: "Yield Protocol",
  stablecoin: "Stablecoin Issuer",
  bridge: "Cross-Chain Bridge",
  infrastructure: "Infrastructure Provider",
  oracle: "Oracle Network",
  wallet: "Wallet Provider",
  identity: "Identity Infrastructure",
  nft: "NFT Platform",
  gaming: "Gaming Platform",
  social: "Social Platform",
  ai: "AI Protocol",
  rwa: "Real-World Asset Platform",
  dao: "DAO Tooling",
  launchpad: "Launchpad",
  analytics: "Analytics Platform",
  security: "Security Provider",
  meme: "Meme Token",
  payments: "Payments Infrastructure",
  other: "Ecosystem Project",
};

/**
 * The hero's one-line summary — "Largest {role} on Base." when this
 * project is the real, computed #1 by TVL among its category peers (an
 * unambiguous, deterministic claim, never a guessed superlative);
 * otherwise the registry's own hand-authored `shortDescription`. `null`
 * when neither applies — hidden entirely, never a fabricated tagline.
 */
function buildHeroSummary(
  shortDescription: string | null,
  categoryLabel: string | undefined,
  leadership: { rank: number; totalInCategory: number } | null | undefined
): string | null {
  if (leadership && leadership.rank === 1 && leadership.totalInCategory > 1 && categoryLabel) {
    return `Largest ${categoryLabel} on Base.`;
  }
  return shortDescription || null;
}

const HEALTH_BADGE_COLOR: Record<Health["label"], GlowBadgeColor> = {
  excellent: "success",
  good: "success",
  fair: "warning",
  poor: "danger",
  unknown: "muted",
};

const CONFIDENCE_BADGE_COLOR: Record<Confidence["level"], GlowBadgeColor> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

const RISK_BADGE_COLOR: Record<Risk["level"], GlowBadgeColor> = {
  low: "success",
  moderate: "warning",
  elevated: "warning",
  high: "danger",
};

/**
 * PR-078B — a publication handle read straight off the registry's own
 * Medium/Mirror URL (`medium.com/@handle`, `handle.medium.com`,
 * `mirror.xyz/handle.eth`, `handle.mirror.xyz`) — the registry schema has
 * no separate "publication name" field, so this is the one real,
 * non-fabricated label derivable from data the registry already has.
 * `null` for a URL shape this doesn't recognize, never a guess.
 */
function extractPublicationHandle(url: string): string | null {
  try {
    const parsed = new URL(url);
    const subdomainMatch = parsed.hostname.match(/^([a-z0-9-]+)\.(medium\.com|mirror\.xyz)$/i);
    if (subdomainMatch) return subdomainMatch[1];
    const firstSegment = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return firstSegment || null;
  } catch {
    return null;
  }
}

/**
 * PR13.7 Goal 1 — every icon slot this Hero supports is always rendered, in
 * this fixed order, whether or not the project has a real link for it.
 * `href: null` means genuinely not configured for this project (or, for
 * `reddit`/`youtube`, not a field this registry's schema tracks at all) —
 * never omitted, per Goal 1's "never hide icons" rule (a deliberate reversal
 * of PR13.6 Goal 4, which hid these).
 */
const ICON_SLOT_ORDER: SocialPlatform[] = [
  "website",
  "x",
  "discord",
  "telegram",
  "farcaster",
  "github",
  "medium",
  "mirror",
  "docs",
  "coingecko",
  "defillama",
  "explorer",
  "reddit",
  "linkedin",
  "youtube",
];

type IconLinkEntry = {
  platform: SocialPlatform;
  href: string | null;
  /** PR-078 §3 — a real, already-computed one-line stat for this platform's tooltip (e.g. GitHub stars/forks/last push, CoinGecko market-cap rank). `undefined` for every platform this codebase has no real per-project metric for — never fabricated. */
  meta?: string;
};

/**
 * PR13.7.1 — a small presence-status dot, bottom-right of the icon, so
 * availability reads at a glance without needing the tooltip. Green means
 * "this project has a real, configured link here"; gray means "not
 * configured" — a neutral fact, never an error, so it's deliberately never
 * red (per this PR's own rule). `ring-radar-light-card`/`dark:ring-radar-card`
 * matches `ProfileHeader`'s own card background, giving the dot a clean
 * cutout against the icon behind it, the same visual convention as an
 * avatar's online-status badge.
 *
 * PR-078B review pass — "available" is hardcoded to neon green `#2CFF05`
 * (spec-mandated exact hex), deliberately distinct from this app's shared
 * `radar-success` token (used broadly elsewhere for badges/pills) so that
 * token's color isn't silently changed app-wide by a request scoped to just
 * this one presence dot. Inactive stays on the existing muted-gray tokens,
 * unchanged.
 */
function PresenceDot({ available }: { available: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-radar-light-card dark:ring-radar-card",
        available ? "bg-[#2CFF05]" : "bg-radar-light-muted/50 dark:bg-radar-muted/50"
      )}
    />
  );
}

/**
 * PR-078B final polish — `website`/`docs` aren't accounts, so "Official
 * account available" was a factually wrong description for them. Every
 * other slot in this row (GitHub, Discord, X, ...) genuinely is a social
 * account/profile link, so their existing wording stays exactly as-is.
 */
const NON_ACCOUNT_DESCRIPTION: Partial<Record<SocialPlatform, string>> = {
  website: "Official Website",
  docs: "Official Documentation",
};

/** One circular icon-link button — the single, consistent recipe every entry in the header's social/provider row renders through (Goal 1: "rounded, hover animation, tooltip, consistent size"), regardless of whether it's a social platform, a data-provider source link, or the block explorer. Renders disabled (muted, unfocusable, "Not available" tooltip) when this project has no real link for the slot — never omitted. A small green/gray `PresenceDot` (PR13.7.1) communicates the same available/unavailable state visually, without relying on color alone — the tooltip and `aria-label` both still spell it out in words. */
export function ProfileIconLink({ platform, href, meta }: IconLinkEntry) {
  const { Icon, label } = SOCIAL_BRANDING[platform];
  if (!Icon) return null;

  if (!href) {
    return (
      <Tooltip content={`${label}: Not available`}>
        <span
          aria-label={`${label}: not available`}
          className="relative flex size-9 shrink-0 cursor-default items-center justify-center rounded-full border border-dashed border-radar-light-border text-radar-light-muted/40 dark:border-white/10 dark:text-radar-muted/30"
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <PresenceDot available={false} />
        </span>
      </Tooltip>
    );
  }

  // PR-078 §3 — when a real per-project metric exists for this platform
  // (GitHub stars/forks/last push, CoinGecko rank), the tooltip upgrades to
  // `RichTooltip` (the same component Health/Confidence/Risk above already
  // use) to show it as a footer line. Every other platform keeps today's
  // plain "Official account available" text — this codebase has no real
  // follower/member/subscriber count for X, Discord, or Telegram anywhere
  // (confirmed: no provider integration fetches them), so none is shown
  // rather than invented.
  const nonAccountDescription = NON_ACCOUNT_DESCRIPTION[platform];
  const description = nonAccountDescription ?? "Official account available";
  const tooltipContent = meta ? (
    <RichTooltip icon={Icon} title={label} description={description} footer={meta} />
  ) : nonAccountDescription ? (
    nonAccountDescription
  ) : (
    `${label}: ${description}`
  );

  return (
    <Tooltip content={tooltipContent}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={nonAccountDescription ?? `${label}: official account available`}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-radar-primary/20 bg-radar-primary/[0.06] text-radar-light-text outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-radar-primary/40 hover:bg-radar-primary/10 hover:text-radar-primary hover:shadow-[0_4px_14px_-4px_rgba(var(--color-radar-primary-rgb),0.5)] focus-visible:ring-2 focus-visible:ring-radar-primary/50 motion-reduce:hover:translate-y-0 dark:border-radar-accent/20 dark:bg-radar-accent/[0.06] dark:text-radar-white dark:hover:border-radar-accent/40 dark:hover:bg-radar-accent/10 dark:hover:text-radar-accent"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <PresenceDot available={true} />
      </a>
    </Tooltip>
  );
}

/**
 * UX polish pass — one labeled cell in the Token Information grid (Token /
 * Contract / Explorer / Max Supply / Circulating). Replaces the previous
 * single crowded inline row: each fact gets its own small "label above
 * value" cell instead of being packed onto one line, so the block reflows
 * cleanly at every width instead of wrapping mid-fact.
 */
function TokenInfoCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
        {children}
      </span>
    </div>
  );
}

/**
 * PR-081 — a secondary insight for one `StatChip`. `"change"` renders
 * through the shared `ChangeValue` component (signed %, green/red, ▲/▼) —
 * the same renderer Price/TVL/Health already use elsewhere on this page, so
 * a chip's secondary reads with the exact same semantics a reader already
 * knows. `"text"` is for a secondary fact that isn't a directional percent
 * (a rank, a ratio, a pool count) — plain muted text, no color implying
 * positive/negative where none is meant. Omit the field entirely (never
 * pass a placeholder string) when no real secondary metric exists for this
 * chip — `StatChip` renders nothing for a missing secondary, never "—".
 */
type MarketSummarySecondary = { kind: "change"; value: number } | { kind: "text"; value: string };

/**
 * PR-083B — groups the Market Summary chips into labeled executive
 * sections instead of one flat grid. Module-level (not recomputed per
 * render) since it has no dependency on props/data — purely structural
 * metadata. `itemIds` reference the stable `id`s set on each
 * `marketSummaryItems` entry, not `label` text, so this survives a future
 * label wording/localization change without breaking grouping. `description`
 * isn't rendered anywhere yet, but exists so a future tooltip/subtitle
 * doesn't require touching this shape again.
 */
const MARKET_SECTIONS: { id: string; title: string; description: string; itemIds: string[] }[] = [
  { id: "market", title: "Market", description: "Price and valuation", itemIds: ["price", "marketCap", "fdv"] },
  { id: "liquidity", title: "Liquidity", description: "Trading depth and activity", itemIds: ["tvl", "volume24h", "liquidity"] },
  { id: "supply", title: "Supply", description: "Token supply and price history", itemIds: ["circulating", "maxSupply", "ath"] },
];

/**
 * UX polish pass, Section 15 / PR-081 — a compact Price/Market Cap/TVL/Liquidity
 * chip column in the header. Deliberately much smaller and lower-detail than
 * the Overview zone's `ExpandableMetricCard`s further down the page (no
 * tooltip, no expand, no chart) — this is a glance-only summary, not a
 * second copy of that data.
 *
 * PR-081 — each chip now stacks Label → Primary value → Secondary insight
 * (rather than one horizontal "icon label value" line), so a reader gets a
 * meaningful second data point (24h change, rank, pool count, ...) without
 * opening the Overview cards below. Same footprint otherwise: no new
 * colors, no gradients/glow/shadows/animation, same border/background
 * language as before.
 */
function StatChip({
  icon: Icon,
  label,
  value,
  secondary,
  footer,
  sparkline,
  unavailable,
  className,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  /** Omitted (not just falsy) when no real secondary metric exists — never a fabricated "—" or "Not Available". */
  secondary?: MarketSummarySecondary;
  /** PR-083 — a tiny muted period/venue label under the secondary (e.g. "24H", "DEX") — a label for what's already shown, never a new data point. Omitted when it wouldn't add real information. */
  footer?: string;
  /**
   * PR-083 addendum — a subtle real-data watermark behind the chip's own
   * text (never a new flow line, so no card ever grows taller because of
   * this). Only the Price chip ever passes this today — the one metric
   * with a real historical series reachable with zero new fetches; every
   * other chip omits it rather than showing an approximated/synthesized
   * trend for data that doesn't have a real history.
   */
  sparkline?: ReactNode;
  unavailable?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // PR-083A — taller padding/gap and a bigger primary value (was
        // px-2.5 py-1.5 / gap-0.5 / text-sm) so this grid actually closes
        // the visual gap against the header's LEFT identity column instead
        // of leaving a bare region beneath it. Secondary/label sizes are
        // deliberately unchanged — the value growing alone is what creates
        // the hierarchy effect being asked for, not every line growing
        // together.
        "relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-radar-light-border bg-radar-light-card px-3.5 py-3 dark:border-white/10 dark:bg-radar-card",
        unavailable && "opacity-60",
        className
      )}
    >
      {sparkline && <div className="absolute inset-x-0 bottom-0 h-full opacity-15" aria-hidden="true">{sparkline}</div>}
      <div className="relative z-10 flex flex-col gap-1.5">
        <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          <Icon className="size-3 shrink-0" aria-hidden="true" />
          {label}
        </span>
        <span className="text-base font-bold tabular-nums text-radar-light-text dark:text-radar-white">{value}</span>
        {secondary &&
          (secondary.kind === "change" ? (
            <ChangeValue value={secondary.value} className="text-[10.5px]" />
          ) : (
            <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{secondary.value}</span>
          ))}
        {footer && <span className="text-[9px] font-medium tracking-wide text-radar-light-muted/70 uppercase dark:text-radar-muted/60">{footer}</span>}
      </div>
    </div>
  );
}

/**
 * The Project Profile's header — PR13.4 Goal 1 rebuild into a "premium
 * project overview": Logo/Name → Category → Description → Social Icons →
 * Community Stats → Health Badges → Quick Actions, each its own clearly
 * separated band instead of one dense identity cluster. Every field is
 * still a real, already-computed value (`ProjectIntelligence`'s own
 * sections, plus the registry's `coingeckoId`/`defillamaSlug` already
 * threaded through this page for other sections' source links) — no new
 * fetch, no fabricated stat.
 *
 * PR13.7 Goal 1 — all 14 icon slots always render (`ICON_SLOT_ORDER`),
 * disabled with a "Not available" tooltip when this project has no real
 * link for that platform, instead of PR13.6 Goal 4's "only show what's
 * configured" — a deliberate, spec-directed reversal so the row's shape
 * never shifts project to project.
 */
export function ProfileHeader({
  identity,
  community,
  chain,
  contracts,
  github,
  market,
  tvl,
  trading,
  health,
  confidence,
  risk,
  coingeckoId,
  defillamaSlug,
  categoryTvlLeadership,
  contractDetailsPromise,
  priceHistory,
}: ProfileHeaderProps) {
  const explorerLink = getExplorerLink(chain, contracts, identity);
  const primaryCategory = identity.categories[0];
  const ecosystemRole = primaryCategory ? ECOSYSTEM_ROLE_LABEL[primaryCategory] : null;
  const heroSummary = buildHeroSummary(identity.shortDescription, ecosystemRole?.toLowerCase(), categoryTvlLeadership);
  const githubHref = github.available && github.fullName ? `https://github.com/${github.fullName}` : null;
  // Goal 1 / PR-072 — logo priority: the registry's own official logo
  // first, then CoinGecko's token image, DefiLlama's protocol logo, and the
  // GitHub repo owner's avatar (all already fetched for this page's other
  // sections — Token & Price, TVL, Engineering Health — no new request),
  // and finally `ProjectLogo`'s own initials-avatar fallback. A broken URL
  // (a 404, not just an absent one) now retries the next real candidate
  // instead of jumping straight to initials — see `logoUrlFallbacks` below
  // and `ProjectLogo`'s own doc comment.
  const logoCandidates = [
    identity.logoUrl,
    market.available ? market.imageUrl : null,
    tvl.available ? tvl.imageUrl : null,
    github.available ? github.avatarUrl : null,
  ].filter((url): url is string => Boolean(url));
  const logoUrl = logoCandidates[0] ?? null;
  const logoUrlFallbacks = logoCandidates.slice(1);

  // Goal 3 — only a real on-chain address view counts as "Explorer" here;
  // `getExplorerLink` falling back to the project's website (no registered
  // contract) or the bare block-explorer homepage never lights up the
  // BaseScan slot — the Website slot above already covers the former, and
  // the latter is exactly the generic-homepage link Goal 3 says never to
  // surface.
  const explorerHref = explorerLink && (explorerLink.tier === "contract" || explorerLink.tier === "token") ? explorerLink.href : null;

  // Goal 1 — one href per fixed slot, `null` where this project (or, for
  // reddit/youtube, this registry's schema) has nothing real to link to.
  // `ProfileIconLink` renders every slot regardless — enabled or disabled.
  const iconHrefBySlot: Record<SocialPlatform, string | null> = {
    website: identity.websiteUrl || null,
    x: community.socials.twitter ?? null,
    discord: community.socials.discord ?? null,
    telegram: community.socials.telegram ?? null,
    github: githubHref,
    medium: community.socials.medium ?? null,
    docs: community.socials.docs ?? null,
    coingecko: coingeckoId ? `https://www.coingecko.com/en/coins/${coingeckoId}` : null,
    defillama: defillamaSlug ? `https://defillama.com/protocol/${defillamaSlug}` : null,
    explorer: explorerHref,
    mirror: community.socials.mirror ?? null,
    reddit: null,
    linkedin: community.socials.linkedin ?? null,
    youtube: null,
    farcaster: community.socials.farcaster ?? null,
    linktree: null,
    blog: community.socials.blog ?? null,
    forum: community.socials.forum ?? null,
    governance: community.governanceUrl ?? null,
  };
  // PR-078 §3 / PR-078B — real, already-computed per-platform tooltip
  // metadata. Every entry below reads a field this codebase already
  // fetches or a value already present in the registry — never a new
  // provider call, never fabricated. Discord/Telegram/X have no real
  // server name, member count, or follower count anywhere in this
  // codebase (confirmed: no Discord/Telegram/X API integration exists,
  // and no registry project currently even configures these three URLs —
  // `grep -rn "discord:|telegram:" data/projects/seed/*.ts` returns zero
  // matches) — deliberately left out rather than inventing a placeholder.
  const iconMetaBySlot: Partial<Record<SocialPlatform, string>> = {
    ...(github.available
      ? {
          github: `${formatCompactNumber(github.stars ?? 0)} stars · ${formatCompactNumber(github.forks ?? 0)} forks · ${formatCompactNumber(github.openIssues ?? 0)} open issues${github.pushedAt ? ` · Last push ${formatDate(github.pushedAt)}` : ""}`,
        }
      : {}),
    ...(market.marketCapRank !== null ? { coingecko: `Ranked #${formatCompactNumber(market.marketCapRank)} by market cap` } : {}),
    ...(tvl.available && tvl.tvlUsd !== null ? { defillama: `${formatCompactCurrency(tvl.tvlUsd)} TVL tracked` } : {}),
  };
  const mediumHandle = community.socials.medium ? extractPublicationHandle(community.socials.medium) : null;
  if (mediumHandle) iconMetaBySlot.medium = `Publication: ${mediumHandle}`;
  const mirrorHandle = community.socials.mirror ? extractPublicationHandle(community.socials.mirror) : null;
  if (mirrorHandle) iconMetaBySlot.mirror = `Publication: ${mirrorHandle}`;
  const iconLinks: IconLinkEntry[] = ICON_SLOT_ORDER.map((platform) => ({
    platform,
    href: iconHrefBySlot[platform],
    meta: iconMetaBySlot[platform],
  }));

  const launchDate = market.genesisDate;
  const marketStatus = market.available ? "Trading" : "No Live Market";

  // PR-079 Section 1 — the header's new compact "Token Info" row, built
  // entirely from fields already threaded into this component (`contracts`,
  // `market`) — no new fetch. Token decimals are deliberately omitted: no
  // provider in this codebase exposes project-level token decimals (only an
  // unrelated per-transfer raw scaling factor exists), and this codebase's
  // own established convention is to hide a field gracefully rather than
  // show a "Not Available" line that adds clutter without value (see
  // `ProfileMetrics.tsx`'s PR13.6 Goals 8-11 doc comment).
  const tokenContract = contracts.items.find((item) => item.chain === chain.primaryChain && item.type === "token");
  // PR-082 Task 4 — Max Supply/Circulating moved out to the Market Summary
  // grid (below), so Token Info's own visibility no longer depends on them:
  // it shows only when there's a real Token cell or Explorer link to show.
  const tokenInfoAvailable = market.available && (Boolean(market.imageUrl && market.symbol) || Boolean(explorerHref));

  // PR-080 Task 1/7 — the header's permanent right-hand "Market Summary"
  // column, built as a plain array + `.map()` instead of hand-written JSX
  // per chip. A future PR adding FDV/Volume/Holders/Rank/ATH/ATL (and
  // eventually a Community Confidence / Trust Score chip once that system
  // exists) only pushes another entry onto this array — the column's layout
  // never needs to change. Every field here is already on
  // `market`/`tvl`/`trading`, same as today's chips — no new fetch, nothing
  // fabricated.
  //
  // PR-081 — each item now also carries an optional `secondary` insight, so
  // a chip answers "what does this number mean" without a click:
  //  - Price: its already-fetched 24h change (same field Overview's Price
  //    card and the header's own `ChangeValue`-based badges already read).
  //  - Market Cap: the single most meaningful secondary this codebase has
  //    for it, in priority order (first real one wins, never more than
  //    one) — global market-cap rank, then circulating-of-max %, then
  //    market cap as a % of FDV. All three are fields already on `Market`.
  //  - TVL: its 24h change. (Only the 24h figure is available synchronously
  //    on the fast-path `Tvl` this component receives — 7d/30d only resolve
  //    later, behind `tvlHistoryPromise`, which isn't threaded into the
  //    header — so 24h is the one real option here, not a preference.)
  //  - Liquidity: the tracked pool count already computed for the Overview
  //    Liquidity card's own helper text.
  // Every branch omits `secondary` entirely (not a placeholder) when the
  // underlying field is `null` — `StatChip` renders nothing for a missing
  // secondary, never a fabricated dash.
  // PR-083 — priority reordered from Rank -> %circ -> %FDV to Rank -> %FDV ->
  // %circ: now that Circulating (below) always shows its own "% of Max" when
  // available, %FDV is the more useful second-choice secondary here (a
  // distinct insight, not the same ratio Circulating already states).
  let marketCapSecondary: MarketSummarySecondary | undefined;
  if (market.marketCapRank !== null) {
    marketCapSecondary = { kind: "text", value: `Rank #${market.marketCapRank}` };
  } else if (market.marketCapUsd !== null && market.fullyDilutedValuationUsd !== null && market.fullyDilutedValuationUsd > 0) {
    marketCapSecondary = { kind: "text", value: `${formatPercent((market.marketCapUsd / market.fullyDilutedValuationUsd) * 100, { showSign: false })} of FDV` };
  } else if (market.circulatingSupply !== null && market.maxSupply !== null && market.maxSupply > 0) {
    marketCapSecondary = { kind: "text", value: `${formatPercent((market.circulatingSupply / market.maxSupply) * 100, { showSign: false })} circ.` };
  }

  // PR-083 addendum — the Price chip's watermark sparkline: real, already
  // computed data (`priceHistory`, reused from the Overview zone's own
  // conversion of `market.sparkline7d`, zero new fetch), colored by the sign
  // of `changePct7d` (the exact field the Momentum card's Trend label already
  // reads — no new derived signal, no new color). Rendered as a background
  // layer by `StatChip` itself, never a new line, so this never changes the
  // chip's height.
  const priceSparkline =
    priceHistory && priceHistory.length > 1 ? (
      <ProfileChart
        data={priceHistory}
        variant="price"
        compact
        height={20}
        color={market.changePct7d !== null && market.changePct7d < 0 ? "var(--color-radar-danger)" : "var(--color-radar-success)"}
      />
    ) : undefined;

  type MarketSummaryItem = {
    /** PR-083B — a stable key for grouping this chip into a `MARKET_SECTIONS` group, independent of `label` (UI text that could change/localize without meaning to break grouping). */
    id: string;
    icon: typeof DollarSign;
    label: string;
    value: string;
    secondary?: MarketSummarySecondary;
    footer?: string;
    sparkline?: ReactNode;
    unavailable: boolean;
  };

  const baseMarketSummaryItems: MarketSummaryItem[] =
    market.available
      ? [
          {
            id: "price",
            icon: DollarSign,
            label: "Price",
            value: market.priceUsd !== null ? formatPrice(market.priceUsd) : "—",
            secondary: market.changePct24h !== null ? { kind: "change", value: market.changePct24h } : undefined,
            footer: market.changePct24h !== null ? "24H" : undefined,
            sparkline: priceSparkline,
            unavailable: market.priceUsd === null,
          },
          {
            id: "marketCap",
            icon: Coins,
            label: "Mkt Cap",
            value: market.marketCapUsd !== null ? formatCompactCurrency(market.marketCapUsd) : "—",
            secondary: marketCapSecondary,
            unavailable: market.marketCapUsd === null,
          },
          {
            id: "tvl",
            icon: Wallet,
            label: "TVL",
            value: tvl.tvlUsd !== null ? formatCompactCurrency(tvl.tvlUsd) : "—",
            secondary: tvl.changePct24h !== null ? { kind: "change", value: tvl.changePct24h } : undefined,
            footer: tvl.changePct24h !== null ? "24H" : undefined,
            unavailable: tvl.tvlUsd === null,
          },
          {
            id: "liquidity",
            icon: Droplets,
            label: "Liquidity",
            value: trading.liquidityUsd !== null ? formatCompactCurrency(trading.liquidityUsd) : "—",
            secondary: trading.available && trading.pairCount > 0 ? { kind: "text", value: `${formatCompactNumber(trading.pairCount)} pools` } : undefined,
            footer: trading.available && trading.pairCount > 0 ? "DEX" : undefined,
            unavailable: trading.liquidityUsd === null,
          },
          // PR-082 Task 3 — moved here from Token Info (never duplicated:
          // Token Info no longer renders either field, see Task 4 above).
          // Same `market.maxSupply`/`market.circulatingSupply` fields, no new
          // fetch — just relocated to sit beside the rest of the market data.
          {
            id: "maxSupply",
            icon: Layers,
            label: "Max Supply",
            value: market.maxSupply !== null ? formatCompactNumber(market.maxSupply) : "—",
            // PR-083 — "Fixed" is a real, verifiable fact whenever a max
            // supply figure exists at all (a non-null max supply *is* a cap).
            // Never asserts "Unlimited" for `null`: that's indistinguishable
            // from "CoinGecko just doesn't have this field" with the data
            // this app has, so claiming it would be a guess, not a fact.
            secondary: market.maxSupply !== null ? { kind: "text", value: "Fixed" } : undefined,
            unavailable: market.maxSupply === null,
          },
          {
            id: "circulating",
            icon: RefreshCw,
            label: "Circulating",
            value: market.circulatingSupply !== null ? formatCompactNumber(market.circulatingSupply) : "—",
            secondary:
              market.circulatingSupply !== null && market.maxSupply !== null && market.maxSupply > 0
                ? { kind: "text", value: `${formatPercent((market.circulatingSupply / market.maxSupply) * 100, { showSign: false })} of Max` }
                : undefined,
            unavailable: market.circulatingSupply === null,
          },
        ]
      : [];

  // PR-083A — up to 3 more real, already-fetched metrics (FDV, ATH, 24H
  // Volume), each appended fully independently of the other two: a project
  // missing one (e.g. no real `athUsd`) still gets the others rather than
  // the whole extra row being withheld. This is why the grid can resolve to
  // anywhere from 6 to 9 chips depending on what a given project actually
  // has, never a fixed on/off binary. No sparkline on any of the three —
  // none has a real historical series (only `market.sparkline7d`, already
  // used by Price, exists anywhere in this codebase).
  const extraMarketSummaryItems: MarketSummaryItem[] = [];
  if (market.available) {
    if (market.fullyDilutedValuationUsd !== null) {
      extraMarketSummaryItems.push({
        id: "fdv",
        icon: Scale,
        label: "FDV",
        value: formatCompactCurrency(market.fullyDilutedValuationUsd),
        unavailable: false,
      });
    }
    if (market.athUsd !== null && market.athUsd > 0 && market.priceUsd !== null) {
      extraMarketSummaryItems.push({
        id: "ath",
        icon: TrendingUp,
        label: "ATH",
        value: formatPrice(market.athUsd),
        secondary: {
          kind: "text",
          value: `${formatPercent(((market.priceUsd - market.athUsd) / market.athUsd) * 100, { showSign: true })} from ATH`,
        },
        unavailable: false,
      });
    }
    if (trading.available && trading.volume24hUsd !== null) {
      extraMarketSummaryItems.push({
        id: "volume24h",
        icon: BarChart3,
        label: "24H Volume",
        value: formatCompactCurrency(trading.volume24hUsd),
        unavailable: false,
      });
    }
  }

  const marketSummaryItems: MarketSummaryItem[] = [...baseMarketSummaryItems, ...extraMarketSummaryItems];

  // PR-083B — one lookup built once, instead of `Array.find()` repeated per
  // item per `MARKET_SECTIONS` group. `marketSummaryItems` remains the
  // single source of truth for chip data; this is a pure O(1)-access view
  // over it.
  const marketItemMap: Record<string, MarketSummaryItem> = Object.fromEntries(marketSummaryItems.map((item) => [item.id, item]));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-radar-light-border bg-gradient-to-br from-radar-light-card to-radar-light-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:from-radar-card dark:to-white/[0.015] sm:p-5">
      {/*
        PR-073 refinement pass — information hierarchy, top to bottom:
        identity (who) -> trust signals (how much to trust it, moved up from
        the very bottom so a reader sees verification/health/risk before
        anything else) -> classification (what it is) -> narrative (why it
        matters) -> provenance (when) -> links (where to go next, lowest
        priority, unchanged at the bottom). No field added or removed, only
        reordered for scannability.
      */}
      {/* PR-083C — the header's 2-region layout, back to an explicit 60/40
          (was briefly a forced 50/50 in PR-083B): LEFT is the primary
          identity column (now including Description/Launched/Social Links,
          not just Token Info/Contract Address — see below), RIGHT is the
          narrower executive Market Summary. `lg:grid-cols-[3fr_2fr]` keeps
          that 60/40 proportional at any viewport width, unlike PR-082's
          original fixed-width-RIGHT approach which drifted wider on large
          screens. `lg:items-start` — neither column is stretched to match
          the other; PR-083B's `h-full`/`grid-rows-[...1fr]` spacer-row trick
          is removed entirely. The actual fix for the dead space it was
          papering over is real content: LEFT now has enough of its own flow
          (identity -> Token Info -> Contract Address -> Description ->
          Launched -> Social Links) that it doesn't need artificial
          stretching to look complete. Both stack vertically below `lg`,
          matching this page's existing mobile-stacking convention. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        {/* LEFT — identity, Token Info, Contract Address, Description, Launched, Social Links, in that reading order — the full identity flow, not just the top third of it. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {/* PR-079 Section 1 — logo enlarged (56px → 76px), the identity anchor for a "world-class intelligence terminal" hero. */}
            <ProjectLogo logoUrl={logoUrl} fallbackUrls={logoUrlFallbacks} name={identity.name} size={76} />
            <div className="flex min-w-0 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-radar-light-text dark:text-radar-white">
                  {identity.name}
                </h1>
                {market.available && market.symbol && (
                  <span className="rounded-md bg-radar-light-surface px-2 py-0.5 text-xs font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
                    {market.symbol}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    market.available
                      ? "bg-radar-success/10 text-radar-success"
                      : "bg-radar-light-surface text-radar-light-muted dark:bg-white/5 dark:text-radar-muted"
                  )}
                >
                  {marketStatus}
                </span>
              </div>

              {/* Trust signals — the second thing a reader sees, right under the name, ahead of category/chain classification. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <VerificationBadge status={community.verificationStatus} compact hideAlternates />
                <Tooltip
                  content={
                    <RichTooltip title="Health Score" description={`Overall score: ${health.label[0].toUpperCase() + health.label.slice(1)} (${health.score}/100)`}>
                      {health.factors.length > 0 && (
                        <>
                          <p className="text-radar-light-muted dark:text-radar-muted">Calculated from:</p>
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {health.factors.map((factor) => (
                              <li key={factor}>✓ {factor}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </RichTooltip>
                  }
                >
                  <GlowBadge
                    color={HEALTH_BADGE_COLOR[health.label]}
                    tabIndex={0}
                    className={cn("gap-1 px-1.5 py-0.5 text-[10px] outline-none", "transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-radar-primary/50")}
                  >
                    <HeartPulse className="size-2.5 shrink-0" aria-hidden="true" />
                    Health: {health.score}/100
                  </GlowBadge>
                </Tooltip>
                <Tooltip
                  content={
                    <RichTooltip title="Confidence Score" description={`How much of this profile comes from live provider data vs. registry defaults: ${confidence.level} (${confidence.score}/100)`}>
                      {confidence.factors.length > 0 && (
                        <>
                          <p className="text-radar-light-muted dark:text-radar-muted">Calculated from:</p>
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {confidence.factors.map((factor) => (
                              <li key={factor}>✓ {factor}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </RichTooltip>
                  }
                >
                  <GlowBadge
                    color={CONFIDENCE_BADGE_COLOR[confidence.level]}
                    tabIndex={0}
                    className={cn("gap-1 px-1.5 py-0.5 text-[10px] outline-none", "transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-radar-primary/50")}
                  >
                    <Brain className="size-2.5 shrink-0" aria-hidden="true" />
                    Confidence: {confidence.score}/100
                  </GlowBadge>
                </Tooltip>
                <Tooltip content={<RichTooltip title="Risk Level" description={risk.explanation} />}>
                  <GlowBadge
                    color={RISK_BADGE_COLOR[risk.level]}
                    tabIndex={0}
                    className={cn("gap-1 px-1.5 py-0.5 text-[10px] outline-none", "transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-radar-primary/50")}
                  >
                    <ShieldAlert className="size-2.5 shrink-0" aria-hidden="true" />
                    {risk.level[0].toUpperCase() + risk.level.slice(1)} Risk
                  </GlowBadge>
                </Tooltip>
              </div>

              {/* PR-079 Section 1 — categories/tags on their own row, chains on a separate row below (previously one combined "classification" row). */}
              <div className="flex flex-wrap items-center gap-1.5">
                {ecosystemRole && (
                  <span className="w-fit rounded-md bg-radar-primary/10 px-2 py-0.5 text-xs font-semibold text-radar-primary">
                    {ecosystemRole}
                  </span>
                )}
                <ProjectCategoryChips categories={identity.categories} tags={identity.tags} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <ProfileChainDisplay chains={chain.chains} />
              </div>
            </div>
          </div>

          {/* Token Info — PR-082 Task 4: simplified to just Token + Explorer now that Max Supply/Circulating live in the Market Summary grid on the right (Task 3) instead — never both places at once. A lightweight identity block, not a mixed identity/market one. */}
          {tokenInfoAvailable && (
            <div className="flex flex-col gap-2 rounded-lg bg-radar-light-surface px-3 py-2.5 dark:bg-white/[0.03]">
              <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Token Info</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {market.imageUrl && market.symbol && (
                  <TokenInfoCell label="Token">
                    <TokenLogo logoUrl={market.imageUrl} symbol={market.symbol} size={16} />
                    {market.symbol}
                  </TokenInfoCell>
                )}
                {explorerHref && (
                  <TokenInfoCell label="Explorer">
                    <a
                      href={explorerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-radar-primary outline-none transition-colors hover:underline focus-visible:underline dark:text-radar-accent"
                    >
                      BaseScan
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  </TokenInfoCell>
                )}
              </div>
            </div>
          )}

          {/* Contract Address — PR-082 Task 2: its own dedicated full-width row directly below Token Info. Single line now (`whitespace-nowrap`, no more `[overflow-wrap:anywhere]` multi-line wrapping) since this block has the full LEFT column's width to itself rather than sharing a ~288px middle column; `overflow-x-auto` is only there for a narrow mobile viewport, not the normal desktop path. */}
          {tokenContract && (
            <div className="flex flex-col gap-1 rounded-lg bg-radar-light-surface px-3 py-2.5 dark:bg-white/[0.03]">
              <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Contract Address</span>
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="whitespace-nowrap font-mono text-xs text-radar-light-text dark:text-radar-white">
                  {tokenContract.address}
                </span>
                <CopyButton value={tokenContract.address} label="token contract address" className="shrink-0" />
              </div>
            </div>
          )}

          {/* PR-083C — Description, Launched, and Social Links moved here
              from below the 2-column grid (where they used to span the full
              card width as siblings after it) into LEFT's own flow, right
              after Contract Address. This is the actual fix for the header's
              dead-space problem: LEFT now has its real identity content
              (name -> badges -> categories -> chains -> Token Info ->
              Contract Address -> Description -> Launched -> Social Links)
              instead of stopping at Contract Address and relying on an
              artificial stretch to look complete. Exact same JSX/data as
              before, only relocated. */}
          {heroSummary && (
            <p className="text-sm leading-relaxed font-medium text-radar-light-text dark:text-radar-white">{heroSummary}</p>
          )}

          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Launched:{" "}
            <span className="font-medium text-radar-light-text dark:text-radar-white">
              {launchDate ? formatDate(launchDate) : "Not Currently Available — no genesis date on record with CoinGecko"}
            </span>
          </p>

          {/* PR-083C.1 — a single-row action bar (was `flex-wrap`, which
              broke into 2-3 uneven rows and added unnecessary header
              height). `flex-nowrap` + `overflow-x-auto` instead of wrapping
              — same horizontal-scroll-fallback convention already used
              elsewhere on this page (`ProfileSectionNav`, `ProfileNetworkLive`)
              — with the scrollbar itself hidden (Tailwind's arbitrary-variant
              form, no new global CSS needed) so it still just reads as a
              clean toolbar rather than a visible scroll widget. Icons
              (`ProfileIconLink`, `size-9 shrink-0`) are untouched — same
              size, same touch target, same hover/tooltip/verified-dot
              behavior — only the row's own wrap/gap changed. */}
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-t border-radar-light-border pt-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] dark:border-white/10 [&::-webkit-scrollbar]:hidden">
            {iconLinks.map((entry) =>
              // PR-078B fix — BaseScan is the one icon whose tooltip needs the
              // precise, per-address `contractDetailsPromise` answer instead of
              // the fast-path `contracts.items[].verified` field (see the prop
              // doc comment above). Every other slot still renders synchronously
              // through the plain `ProfileIconLink`.
              entry.platform === "explorer" && explorerHref ? (
                <Suspense key={entry.platform} fallback={<ProfileIconLink platform="explorer" href={explorerHref} />}>
                  <ProfileHeaderExplorerTooltipAsync href={explorerHref} contracts={contracts} contractDetailsPromise={contractDetailsPromise} />
                </Suspense>
              ) : (
                <ProfileIconLink key={entry.platform} {...entry} />
              )
            )}
          </div>
        </div>

        {/* RIGHT — three labeled executive groups (Market / Liquidity /
            Supply), still fully array-driven — `MARKET_SECTIONS.map()` over
            structural metadata, each section's chips resolved from
            `marketItemMap` (itself derived from `marketSummaryItems`, the
            one place chip data is computed) — never hardcoded JSX per row
            or per section. PR-083C — tightened from PR-083B's `gap-4`
            between sections + bordered title down to `gap-2.5` and an
            unbordered title with minimal margin, so the three groups read
            as one dense executive panel instead of three separated islands
            (the divider rule was doing more visual separation than three
            closely-related groups need — the cards' own borders already
            carry the grouping). No `h-full`/spacer-row trick — RIGHT sizes
            to its own (now denser) natural content height. */}
        {marketSummaryItems.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {MARKET_SECTIONS.map((section) => {
              const items = section.itemIds.map((id) => marketItemMap[id]).filter((item): item is MarketSummaryItem => item !== undefined);
              if (items.length === 0) return null;
              return (
                <div key={section.id} className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                    {section.title}
                  </span>
                  <div className={cn("grid gap-1.5", items.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
                    {items.map((item) => (
                      <StatChip
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                        secondary={item.secondary}
                        footer={item.footer}
                        sparkline={item.sparkline}
                        unavailable={item.unavailable}
                        className="w-full"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
