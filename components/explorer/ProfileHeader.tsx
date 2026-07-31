import { Brain, HeartPulse, ShieldAlert } from "lucide-react";

import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ProfileChainDisplay } from "@/components/explorer/ProfileChainDisplay";
import { ProfileQuickActions } from "@/components/explorer/ProfileQuickActions";
import { ProjectCategoryChips } from "@/components/explorer/ProjectCategoryChips";
import { VerificationBadge } from "@/components/explorer/VerificationBadge";
import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { getExplorerLink } from "@/lib/branding/explorerLink";
import { SOCIAL_BRANDING } from "@/lib/branding/socials";
import type { SocialPlatform } from "@/lib/branding/types";
import { formatDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { ProjectCategory } from "@/data/projects/enums";
import type { ChainInfo, Community, Confidence, Contracts, GithubIntel, Health, Identity, Market, Risk, Tvl } from "@/lib/intelligence/types";

type ProfileHeaderProps = {
  identity: Identity;
  community: Community;
  chain: ChainInfo;
  contracts: Contracts;
  github: GithubIntel;
  market: Market;
  /** PR-072 — carries DefiLlama's own protocol logo (`tvl.imageUrl`), the third-priority logo candidate after the registry and CoinGecko. */
  tvl: Tvl;
  health: Health;
  confidence: Confidence;
  risk: Risk;
  /** Registry provider ids — already fetched for Token & Price / TVL sourceLinks elsewhere on this page; reused here to build the CoinGecko/DefiLlama icon links, never a new lookup. */
  coingeckoId: string | null;
  defillamaSlug: string | null;
  /**
   * PR-062 Task 1 — this project's real rank by TVL among its category
   * peers, computed once in `page.tsx` via the same `lib/projects` Live
   * Projects Service `lib/intelligence/report.ts`'s `categoryTvlLeadership`
   * reuses — never a second ranking implementation. `null`/omitted falls
   * back to the registry's own `shortDescription` for the hero one-liner.
   */
  categoryTvlLeadership?: { rank: number; totalInCategory: number } | null;
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

type IconLinkEntry = { platform: SocialPlatform; href: string | null };

/**
 * PR13.7.1 — a small presence-status dot, bottom-right of the icon, so
 * availability reads at a glance without needing the tooltip. Green means
 * "this project has a real, configured link here"; gray means "not
 * configured" — a neutral fact, never an error, so it's deliberately never
 * red (per this PR's own rule). `ring-radar-light-card`/`dark:ring-radar-card`
 * matches `ProfileHeader`'s own card background, giving the dot a clean
 * cutout against the icon behind it, the same visual convention as an
 * avatar's online-status badge.
 */
function PresenceDot({ available }: { available: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-radar-light-card dark:ring-radar-card",
        available ? "bg-radar-success" : "bg-radar-light-muted/50 dark:bg-radar-muted/50"
      )}
    />
  );
}

/** One circular icon-link button — the single, consistent recipe every entry in the header's social/provider row renders through (Goal 1: "rounded, hover animation, tooltip, consistent size"), regardless of whether it's a social platform, a data-provider source link, or the block explorer. Renders disabled (muted, unfocusable, "Not available" tooltip) when this project has no real link for the slot — never omitted. A small green/gray `PresenceDot` (PR13.7.1) communicates the same available/unavailable state visually, without relying on color alone — the tooltip and `aria-label` both still spell it out in words. */
function ProfileIconLink({ platform, href }: IconLinkEntry) {
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

  return (
    <Tooltip content={`${label}: Official account available`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}: official account available`}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-radar-light-border text-radar-light-muted outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-radar-primary/40 hover:bg-radar-primary/10 hover:text-radar-primary hover:shadow-[0_4px_14px_-4px_rgba(var(--color-radar-primary-rgb),0.5)] focus-visible:ring-2 focus-visible:ring-radar-primary/50 motion-reduce:hover:translate-y-0 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-accent/40 dark:hover:bg-radar-accent/10 dark:hover:text-radar-accent"
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <PresenceDot available={true} />
      </a>
    </Tooltip>
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
  health,
  confidence,
  risk,
  coingeckoId,
  defillamaSlug,
  categoryTvlLeadership,
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
  const iconLinks: IconLinkEntry[] = ICON_SLOT_ORDER.map((platform) => ({ platform, href: iconHrefBySlot[platform] }));

  const launchDate = market.genesisDate;
  const marketStatus = market.available ? "Trading" : "No Live Market";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-radar-light-border bg-gradient-to-br from-radar-light-card to-radar-light-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:from-radar-card dark:to-white/[0.015] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <ProjectLogo logoUrl={logoUrl} fallbackUrls={logoUrlFallbacks} name={identity.name} size={56} />
          <div className="flex min-w-0 flex-col gap-2">
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
            {/* PR-062 Task 1 — Ecosystem Role: a real, registry-driven phrase describing this project's role, distinct from the plain category taxonomy chip below. */}
            {ecosystemRole && (
              <span className="w-fit rounded-md bg-radar-primary/10 px-2 py-0.5 text-xs font-semibold text-radar-primary">
                {ecosystemRole}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <ProjectCategoryChips categories={identity.categories} tags={identity.tags} />
              <ProfileChainDisplay chains={chain.chains} />
            </div>
            {/* Goal 1 — Launch Date, from CoinGecko's genesis date (already fetched for this page, never a new request). "Not Currently Available" only when CoinGecko itself has no genesis date on record for this token. */}
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">
              Launched:{" "}
              <span className="font-medium text-radar-light-text dark:text-radar-white">
                {launchDate ? formatDate(launchDate) : "Not Currently Available — no genesis date on record with CoinGecko"}
              </span>
            </p>
          </div>
        </div>

        <ProfileQuickActions projectId={identity.id} projectName={identity.name} />
      </div>

      {/* PR-062 Task 1 — the hero's concise, deterministic summary: a real category-TVL-leadership claim when this project is the computed #1 in its category, else the registry's own hand-authored `shortDescription`. Hidden entirely when neither is available — never a fabricated tagline. */}
      {heroSummary && (
        <p className="max-w-3xl text-base leading-relaxed font-medium text-radar-light-text dark:text-radar-white">{heroSummary}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-radar-light-border pt-4 dark:border-white/10">
        {iconLinks.map((entry) => (
          <ProfileIconLink key={entry.platform} {...entry} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-radar-light-border pt-4 dark:border-white/10">
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
        <Tooltip
          content={
            <RichTooltip title="Risk Level" description={risk.explanation} />
          }
        >
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
    </div>
  );
}
