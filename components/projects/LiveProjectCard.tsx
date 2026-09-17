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
 * variant dimensions, never a forked/duplicated card.
 *
 * Universal Project Card, PR-2A — restructured into the Product Standard's
 * six canonical rows (§6, "One Question Per Row"): Identity, Trust, Score,
 * Metric, Status, Secondary (`detailed` only). `categoryPeers` is a new,
 * optional prop (Category Rank, §9) — no current caller passes it yet, so
 * rank simply doesn't render anywhere yet; wiring real callers is out of
 * this PR's file scope.
 *
 * Universal Project Card, PR-2B — accessibility/interaction/budget polish:
 * `WatchButton` now renders as a sibling overlay, not a descendant of the
 * `Link` — a `<button>` nested inside an `<a>` is invalid HTML and broke
 * §17's "never nested inside the navigation link" rule. At `compact`
 * density, Trust and Status merge into one row (§14's row cap, corrected to
 * 3 simultaneous badges — see the Standard's own Engineering Note on this
 * correction); `detailed` keeps them as two separate rows, unchanged.
 *
 * Universal Project Card, PR-3 — the third density tier, `micro`: a single-
 * line row (§5.B, §16), not a card — no border/shadow chrome, sized for
 * list contexts (Watchlists rows, ⌘K search results, per §5.B's own stated
 * use cases; no consumer wired yet, per this PR's own scope). Its field set
 * is exactly and only §5.B's five: logo, name, one chain badge, the AI
 * Rating grade, the primary metric value — per §12 v1.2 (EN-002), Trust
 * Indicators, Risk Badge, Project Status, 24h change, and Watch button are
 * no longer part of `micro`'s canonical anatomy; a host page that needs a
 * watch/remove affordance on a `micro` row owns that interaction itself.
 * Returned as an early branch, independent of every `compact`/`detailed`
 * line below it — this tier never touches their code paths.
 *
 * A Server Component throughout — `next/link`, `ProjectLogo`, and
 * `WatchButton` all compose fine without this file itself needing
 * `"use client"`.
 *
 * PR-085.02A (EN-004/005/006) — the Row 4 Metric row's change value now
 * reads 7-day momentum (falling back to 24h, matching MetricItem's own
 * existing "—" fallback) at both `compact` and `detailed`, independent of
 * which field ended up as the primary metric. The Score row's AI
 * Recommendation phrase is no longer `detailed`-only — it renders at
 * `compact` too, reusing `RECOMMENDATION_FOR_RISK` exactly, unchanged. The
 * `detailed`-only Secondary row was replaced: instead of up to three
 * conditional tiles (TVL/Volume/GitHub Activity), it now shows exactly one
 * field via `discoverySecondaryMetric()`'s FDV → Market Cap → 24h Volume →
 * "Not Tracked" priority chain — GitHub Activity no longer appears on
 * discovery cards (it remains on the Project Profile page). `micro`
 * (EN-006) and Search's `SearchProjectRow` (EN-005, not a consumer of this
 * file) are both explicitly unchanged by this PR.
 *
 * PR-085.03 — Executive Card Final Polish. Row 4 (Metric) is now always
 * five simultaneous values at `detailed`: the category-aware primary
 * (unchanged selection rule) plus the four fixed fields `standardMetrics()`
 * returns (Market Cap, Price, 24H Volume, FDV) — this replaces
 * PR-085.02A's single `discoverySecondaryMetric` field, which is now dead
 * and removed. Per the Product Owner's explicit resolution of a real §14
 * Cognitive Load Budget conflict (6 required values vs. the frozen 5-value
 * cap), 7-day momentum is no longer a sixth standalone value — it's an
 * inline annotation on the primary metric's own cell (`MetricItem`'s new
 * `changeAnnotation` prop), so the row still totals exactly five. `compact`
 * is unchanged (still primary + a separate momentum tile, its own 2-value
 * budget was never in conflict). A new social-icon row (Identity, real
 * links only, `detailed` only) reuses `SOCIAL_BRANDING`/`BrandIcons` from
 * the Project Profile Hero — no new icon set. Because that row is a real
 * `<a>`, and the whole card is already itself a `<Link>` (nesting
 * interactive content inside `<a>` is invalid HTML — the exact problem
 * PR-2B's `WatchButton` extraction already solved once), the Link is now a
 * full-bleed `peer` overlay *behind* the visible content instead of a
 * wrapper *around* it: content sits above with `pointer-events-none` (so
 * an ordinary click still reaches the Link underneath), and only the
 * social-icon row opts back in with `pointer-events-auto`. The existing
 * hover glow moves from the card's own `hover:` to `peer-hover:` for the
 * same reason — the Link, not the content div, is what the pointer
 * actually hits now. A `detailed`-only, hover-only animated ring
 * (`br-card-rainbow-spin`, `app/globals.css`) reuses `TrustedDataSources`'s
 * masked-conic-gradient technique on its own `--card-angle` property.
 *
 * PR-085.03B — final typographic/emphasis polish, no layout/architecture
 * change. The Recommendation phrase (Row 3) is now a labeled block, not
 * trailing caption text. The Standard Metrics grid (Row 4) is
 * typographically tiered — Market Cap highest, 24H Volume/FDV medium,
 * Price lowest — same four fields/values/order, `MetricItem`'s new opt-in
 * `valueClassName`. `ecosystemRoleTag()`'s phrase set was revised to add
 * real context instead of restating the Verification badge already shown
 * in Row 2. The rainbow ring's rotation slowed from 3s to 5.5s. Confidence
 * de-emphasis and the timestamp's removal both live in `TrustIndicators.tsx`
 * — see that file's own doc comment.
 */

import Link from "next/link";

import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { MetricItem } from "@/components/explorer/MetricItem";
import { LiveProjectCardMomentum } from "@/components/projects/LiveProjectCardMomentum";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { RiskBadge } from "@/components/projects/RiskBadge";
import { TrustIndicators } from "@/components/projects/TrustIndicators";
import { WatchButton } from "@/components/watchlists/WatchButton";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { SOCIAL_BRANDING } from "@/lib/branding/socials";
import { RECOMMENDATION_FOR_RISK } from "@/lib/intelligence/report";
import { cn } from "@/lib/utils";
import type { LiveProject } from "@/lib/projects/types";
import type { RiskContributor, RiskContributorSeverity } from "@/lib/intelligence-engine";
import { categoryPrimaryMetric, standardMetrics } from "@/lib/projects/primaryMetric";
import { getCategoryRank } from "@/lib/projects/rank";

export type LiveProjectCardVariant = "detailed" | "compact" | "micro";

/**
 * PR-085.03B, Finding 4 — Market Cap (highest importance) stays at
 * `MetricItem`'s own baseline weight; 24H Volume/FDV (medium) drop to 85%
 * opacity; Price originally dropped to a smaller, lighter, non-bold
 * treatment (approved requirement at the time: "Do NOT remove Price. Simply
 * reduce its visual prominence").
 *
 * PR-084.xx re-evaluation — Market Cap now explicitly overrides to
 * `text-base` (was implicitly `text-sm` via `undefined`). The 2×2 grid
 * below gives every cell roughly double its old width; without this, that
 * width would sit unused as empty space rather than reinforcing the
 * existing hierarchy.
 *
 * PR-091 — that original call reversed: Price at `text-xs font-normal`
 * plus a muted color read as visibly weaker than its three siblings and
 * was judged wrong for a primary financial metric on an executive card.
 * Price now shares 24H Volume/FDV's exact tier (their same un-bolded-
 * relative-to-Market-Cap 85%-opacity treatment, `MetricItem`'s own default
 * `text-sm font-semibold` size/weight, one real Tailwind step up from the
 * old `text-xs`) — three metrics now share one consistent middle tier below
 * Market Cap alone at the top, rather than three separate tiers. Same four
 * fields, same values, same order, same 2×2 grid — typography only.
 */
const STANDARD_METRIC_EMPHASIS: Record<string, string | undefined> = {
  "Market Cap": "text-base",
  "24H Volume": "text-radar-light-text/85 dark:text-radar-white/85",
  FDV: "text-radar-light-text/85 dark:text-radar-white/85",
  Price: "text-radar-light-text/85 dark:text-radar-white/85",
};

/**
 * PR-085.10 — compact footer column labels, mixed case per the approved
 * spec ("Do not use all-uppercase abbreviations"): "Market Cap" and "Price"
 * are `standardMetrics()`'s own labels already, unchanged; only "24H
 * Volume" gets a shorter column heading. Presentation only —
 * `standardMetrics()`'s own labels, used everywhere else on the card, are
 * untouched.
 */
const COMPACT_METRIC_LABEL: Record<string, string> = { "24H Volume": "24H Vol" };

/** PR-084.xx — a compact footer column with no real value always reads "Not Tracked," the same placeholder the detailed variant's own `standardMetrics()` grid already uses for the identical semantic state (a metric that genuinely has no current value) — previously Market Cap alone used this phrase while Price/24H Volume used a bare "—" in the same row, three different placeholders for one meaning. */
const COMPACT_METRIC_UNAVAILABLE: Record<string, string> = { "Market Cap": "Not Tracked", Price: "Not Tracked", "24H Volume": "Not Tracked" };

type LiveProjectCardProps = {
  project: LiveProject;
  /** `"detailed"` (default) is the Full Directory's card; `"compact"` is curated-rails-only; `"micro"` is a single-line row for list contexts (§5.B) — no consumer wired yet (PR-3's own scope). Never a second component — see this file's own doc comment. */
  variant?: LiveProjectCardVariant;
  /** Every `LiveProject` in `project.category` (Product Standard §9, Category Rank) — omit when the caller doesn't already have the full category list loaded; rank simply doesn't render rather than triggering a new fetch (§22, Performance Budget). */
  categoryPeers?: LiveProject[];
  className?: string;
  /**
   * V1-FIX-001, second pass — `detailed`'s Row 4 hero-metric grid reserves
   * `min-h-[108px]` (see that div's own doc comment) specifically so every
   * card in a *grid of siblings* (Full Directory, `ProfileRelatedProjects`)
   * lands at the same height regardless of which cells wrap. `ProjectSpotlight`
   * renders exactly one `detailed` card, alone, with no siblings to
   * misalign against — the reservation is dead weight there, not a real
   * constraint. Opt-in and defaulted `false` so every existing consumer
   * (Full Directory, `ProfileRelatedProjects`) keeps the exact reservation
   * it was built for; only `ProjectSpotlight` passes `true`.
   */
  soloCard?: boolean;
};

/**
 * V1-FIX-017 — Visible Risk Evidence. `RiskContributor[]` (real, already
 * computed by `generateRiskAnalysis`, already threaded onto `LiveProject`)
 * was previously only reachable by hovering `RiskBadge`'s tooltip — real
 * evidence, zero glanceability. `riskContributors` is built by
 * `lib/intelligence-engine/rule-based-provider.ts`'s `buildRiskContributors()`
 * via unconditional `.push()` calls in a fixed factor-check order
 * (verification → liquidity → centralization → TVL → developer health →
 * governance → freshness) — confirmed by reading that function directly —
 * so `contributors[0]` is NOT the worst/most-relevant factor, just whichever
 * one happens to be checked first. Selecting the genuinely worst one
 * requires ranking by the real `severity` field already on each contributor
 * — a deterministic max-selection over already-computed data, not new
 * scoring.
 */
const SEVERITY_PRIORITY: Record<RiskContributorSeverity, number> = { high: 0, moderate: 1, unknown: 2, low: 3 };

function pickTopRiskContributor(contributors: RiskContributor[]): RiskContributor | null {
  if (contributors.length === 0) return null;
  return [...contributors].sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity])[0];
}

/**
 * A short, card-appropriate phrase for the top risk contributor — never the
 * full `.detail` sentence (too long for a single truncated line), never
 * `.label` alone (per the approved refinement: "Liquidity Risk"/"TVL
 * Stability" require interpretation a 3-second read shouldn't need).
 * Every phrase below is a direct, faithful shortening of that exact
 * `(label, severity)` combination's real `.detail` text — read straight out
 * of `buildRiskContributors()`, never invented. Two deliberate omissions:
 * `"Centralization"` never gets a phrase — its `.detail` is always "Not
 * assessed — no on-chain holder-distribution... data source is available,"
 * i.e. this codebase has explicitly never computed a real finding for it,
 * so summarizing it as a concern would be the exact "guess" this function
 * is required not to make. `"unknown"`/`"low"` severities never get a
 * phrase either (see `topRiskConcernText`'s own doc comment for why) — this
 * function is only ever called for a `"high"`/`"moderate"` contributor.
 * TVL Stability's high-severity direction ("declining" vs "surging") reads
 * `market.changePct7d`'s own sign directly — the same real field this card
 * already displays in its momentum cell, not a string-parse of the
 * contributor's own formatted sentence.
 */
function shortRiskExplanation(contributor: RiskContributor, project: LiveProject): string | null {
  const { label, severity } = contributor;
  if (label === "Smart Contract Risk") {
    if (severity === "high") return "Low contract verification";
    if (severity === "moderate") return "Partial contract verification";
  }
  if (label === "Liquidity Risk") {
    if (severity === "high") return "Low liquidity";
    if (severity === "moderate") return "Moderate liquidity";
  }
  if (label === "TVL Stability") {
    if (severity === "high") return (project.market.changePct7d ?? 0) < 0 ? "TVL declining" : "TVL surging";
    if (severity === "moderate") return "TVL fluctuating";
  }
  if (label === "Developer Health") {
    if (severity === "high") return "Developer inactivity";
    if (severity === "moderate") return "Low developer activity";
  }
  if (label === "Governance Activity" && severity === "moderate") return "No active governance";
  if (label === "Data Freshness") {
    if (severity === "high") return "Stale data";
    if (severity === "moderate") return "Mixed data freshness";
  }
  return null;
}

/**
 * The one line Row 2b renders, if any. Gated on the CARD's overall
 * `riskLevel` (never for `"low"` — unchanged behavior there, per the
 * approved scope: "Low Risk should behave exactly as today. No additional
 * text. No visual changes.") AND on the selected contributor's own
 * `severity` being genuinely `"high"`/`"moderate"` — `pickTopRiskContributor`
 * can technically return an `"unknown"`/`"low"`-severity contributor (e.g. a
 * project whose elevated risk comes from a factor outside this list
 * entirely, like whale activity or a blended health/confidence score), and
 * showing a neutral or reassuring factor as "the reason" for an elevated
 * rating would be actively misleading, not just unhelpful — the safer,
 * honest behavior is to show nothing and let the tooltip (still fully
 * intact, still showing every real contributor) carry that case.
 */
function topRiskConcernText(project: LiveProject): string | null {
  if (project.riskLevel === null || project.riskLevel === "low") return null;
  const top = pickTopRiskContributor(project.riskContributors);
  if (!top || (top.severity !== "high" && top.severity !== "moderate")) return null;
  return shortRiskExplanation(top, project);
}

/**
 * PR-061 — Task 8: "why should I care?" in one short, deterministic phrase.
 * Every branch reads a real, already-present field — never an invented
 * ranking or generated summary. Priority order: an established, well-
 * capitalized project first, then real signs of current activity
 * (governance, engineering), then confidence, then honestly falling back to
 * "Newly discovered" for a standalone Discovery candidate with none of the
 * above yet — never a blank line.
 *
 * PR-085.03B, Finding 5 — revised to add real *context* rather than restate
 * the Verification badge already shown above it in Row 2 ("Blue-chip,
 * verified"/"Editorially verified" duplicated that badge's own text). Every
 * branch still reads only real, already-present fields — no new provider
 * calls, no invented signal. Two of the directive's six example phrases
 * ("Institutional adoption", "Fast-growing protocol") are deliberately
 * *not* used: neither has a real backing field (no adoption metric exists;
 * a growth-rate phrase would just restate the 7D change already annotated
 * on the primary metric above), and this function's own contract has
 * always been "never an invented ranking or generated summary."
 *
 * PR-085.12 — a two/three-line "Executive Summary" enrichment (a label row
 * plus an evidence-based second line) was built and browser-verified, but
 * rejected after real-data review: it measurably grew card height (+36px,
 * +7.2%) for information that, at real-data scale, wasn't actually
 * differentiating — a follow-up audit against the full live catalog (1,009
 * projects) found governance and verified-contract counts are dead fields
 * (0% of projects), and the one real remaining signal ("confirmed by
 * multiple providers") is concentrated almost entirely in exactly the
 * verified/leaderboard cards already carrying a verification badge, making
 * it both non-rare in the views that matter and redundant with what's
 * already shown. Decision: no second line, ever — this function still
 * returns exactly one string, unchanged from its pre-085.12 behavior.
 *
 * V1-FIX-010 — the governance/engineering branches now interpolate the real
 * number each already reads into scope (`governance.activeProposalCount`,
 * `engineering.commitsLast7d`) instead of a bare qualitative label — same
 * two fields, same priority order, same one-string/one-line contract; only
 * the string itself got more specific. This is presentation-only: no new
 * field, no new branch, no new provider call. (PR-085.12's own audit found
 * governance counts near-universally absent across the real catalog — this
 * branch stays low-incidence in practice, but costs nothing extra and is
 * strictly more informative on the rare project where it's real.)
 *
 * V1-FIX-018 — "Why Today?" priority rework. This function previously
 * ordered every branch by how *established* a project is (blue-chip → infra
 * → verified → confidence → discovery), which answers "why does this
 * project matter" but not "why does it deserve attention today" — a static
 * fact is true every day, so it can never explain *today* specifically.
 * Confirmed live and by name: Aave and Compound BOTH have a real, active
 * governance proposal right now (checked directly on their Project Profile
 * pages), yet both rendered "Blue-chip ecosystem leader" because that check
 * ran first — real "why today" evidence was masked by a static fact on the
 * exact two projects most likely to have one. Three branches now run first,
 * ordered by how strictly each is bound to a recent time window: a real 24h
 * price move (`market.changePct24h`, the only field here whose definition
 * IS a bounded "last 24 hours" delta) outranks commits this week (a 7-day
 * delta), which outranks an active governance proposal (real and live, but
 * a standing state — a proposal could have opened weeks ago — not itself a
 * delta). The five original static branches below are otherwise byte-
 * identical and keep their exact relative order; they're demoted, not
 * rewritten. `market.changePct7d` was investigated and deliberately NOT
 * added here: it's already the headline number in Row 4's momentum cell on
 * most cards (`momentumPct` prefers 7D over 24H) — restating it here would
 * be duplication, not new information, the exact thing this feature is
 * required not to do. `verification.verifiedAt` and `registryUpdatedAt`
 * were also investigated and rejected: grepped directly against every seed
 * registry file (`data/projects/seed/*.ts`) and confirmed neither field is
 * ever set on any of the 20 registry projects today — a "Verified this
 * week" or "Registry updated today" phrase built on either would be
 * unreachable dead code, not real intelligence.
 */
/**
 * V1-FIX-018 — a presentation-only display threshold: how large a 24h price
 * move has to be before this one line is worth spending on it instead of a
 * static fact. NOT a shared or reused business-rule constant — investigated
 * first (this codebase keeps every market-movement threshold local and
 * unexported per module, never centralized: `lib/alerts/providers/
 * coingecko.ts`'s 3/8/20%, `lib/alerts/providers/defillama.ts`'s 5/15%,
 * `lib/dashboard/executiveSummary.ts`'s 5%, `lib/ai-intelligence/generator/
 * rules.ts`'s 15/30% — each tuned to its own consumer, none exported for
 * reuse). This constant follows that same established pattern: its own
 * independent value, scoped to this file, answering only "is this move
 * worth this card's one glanceable line" — never imported by, or derived
 * from, any alerts/executive-summary/AI-intelligence threshold above.
 */
const NOTABLE_PRICE_MOVE_PCT = 8;

function ecosystemRoleTag(project: LiveProject): string {
  const { verification, governance, engineering, confidence, market, category } = project;
  const isInfraLike = category === "infrastructure" || category === "bridge" || category === "oracle";
  if (market.changePct24h !== null && Math.abs(market.changePct24h) >= NOTABLE_PRICE_MOVE_PCT) {
    const pct = market.changePct24h;
    return `Price ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% today`;
  }
  if (engineering.commitsLast7d !== null && engineering.commitsLast7d > 0) {
    return `${engineering.commitsLast7d} commit${engineering.commitsLast7d === 1 ? "" : "s"} this week`;
  }
  if (governance.configured && (governance.activeProposalCount ?? 0) > 0) {
    const count = governance.activeProposalCount as number;
    return `${count} active governance proposal${count === 1 ? "" : "s"}`;
  }
  if (verification.status === "verified" && (market.tvlUsd ?? 0) > 1_000_000_000) return "Blue-chip ecosystem leader";
  if (verification.status === "verified" && isInfraLike) return "Established infrastructure";
  if (verification.status === "verified") return "Editorially verified";
  if (confidence.level === "high" && project.source === "discovery") return "Emerging ecosystem project";
  if (confidence.level === "high") return "High confidence";
  if (project.source === "discovery") return "Newly discovered";
  // V1-FIX-020 — Executive Copy & Narrative. "Tracked project" was the
  // weakest string on the card: it told the reader nothing they didn't
  // already know just from the project rendering on a tracking product at
  // all. This branch only fires when every other real signal above is
  // absent — the one fact still true and worth stating here is that the
  // project is real, tracked registry data, scoped to this app's actual
  // subject (the Base ecosystem), not a placeholder. Wording only: same
  // branch, same trigger condition, same line, same style.
  return "Base ecosystem project";
}

/**
 * V1-FIX-004/009 — Needs Review trust audit. `ecosystemRoleTag()` above is a
 * general "why does this project matter" phrase, and for a `needs-review`
 * card it was falling through to a generic, uninformative fallback
 * ("Newly discovered"/"Base ecosystem project") — the SAME single-line slot this
 * function shares, but with none of the real reason a `needs-review` status
 * was actually assigned. `project.discoveryEvidence.statusReason` is the
 * exact, already-computed, evidence-citing string `computeDiscoveryStatus()`
 * (`lib/discovery/status.ts`) produced for THIS card's real status — e.g.
 * "Matched USD Coin on a unique identifier (coingeckoId), but the reported
 * name ('USDC') differs..." — never a new computation, never invented text.
 * Investigation finding: a `needs-review` card can reference an already-
 * verified registry project (a weak "alias"/name-only match against it,
 * which `computeDiscoveryStatus()` correctly keeps at `needs-review` even
 * when the matched project is verified, since match CONFIDENCE — not the
 * matched project's trustworthiness — is what's actually uncertain there).
 * Surfacing the real reason is what stops that from reading as "a trusted
 * project is untrustworthy" — it explains this is an unconfirmed candidate
 * possibly related to a known project, not a claim about the known project
 * itself. Falls back to `ecosystemRoleTag()` for every other status,
 * unchanged.
 */
function roleTagOrReviewReason(project: LiveProject): string {
  if (project.discoveryStatus === "needs-review" && project.discoveryEvidence?.statusReason) {
    return project.discoveryEvidence.statusReason;
  }
  return ecosystemRoleTag(project);
}

export function LiveProjectCard({ project, variant = "detailed", categoryPeers, className, soloCard }: LiveProjectCardProps) {
  const isDiscoveryOnly = project.source === "discovery";
  const isCompact = variant === "compact";
  const { identity, chains, market, aiRating, riskLevel, riskContributors } = project;

  const metric = categoryPrimaryMetric(project);

  // §5.B/§16 — a single-line row, not a card: exactly logo, name, one chain
  // badge, the AI Rating grade, and the primary metric value. Returned
  // before any `compact`/`detailed` computation below runs, so this branch
  // never affects — and is never affected by — either of those variants.
  if (variant === "micro") {
    const microRow = (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors",
          !isDiscoveryOnly && "hover:bg-radar-light-surface dark:hover:bg-white/5",
          className
        )}
      >
        <ProjectLogo logoUrl={identity.logoUrl} fallbackUrls={identity.logoUrlFallbacks} name={identity.name} size={20} />
        <span title={identity.name} className="min-w-0 flex-1 truncate font-medium text-radar-light-text dark:text-radar-white">
          {identity.name}
        </span>
        <ChainBadgeGroup chains={chains} size="sm" max={1} className="shrink-0 flex-nowrap" />
        <span className="shrink-0 text-xs font-semibold text-radar-light-text dark:text-radar-white">{aiRating ?? "—"}</span>
        <span
          title={metric.value ?? "Not Tracked"}
          className="shrink-0 truncate text-xs tabular-nums text-radar-light-muted dark:text-radar-muted"
        >
          {metric.value ?? "Not Tracked"}
        </span>
      </div>
    );

    if (!project.slug) return microRow;

    return (
      <Link
        href={`/dashboard/projects/${project.slug}`}
        aria-label={identity.name}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
      >
        {microRow}
      </Link>
    );
  }

  const categoryRank = !isCompact ? getCategoryRank(project, categoryPeers ?? []) : null;
  const recommendation = riskLevel !== null ? RECOMMENDATION_FOR_RISK[riskLevel] : null;
  const riskConcern = !isCompact ? topRiskConcernText(project) : null;
  // PR-085.03, Requirement 5 — the four fields every `detailed` card always
  // shows alongside the category-aware primary metric above; supersedes
  // PR-085.02A's single `discoverySecondaryMetric` field (now removed).
  // PR-085.05, Task 2 — now computed for `compact` too (a cheap, pure read
  // of already-loaded `LiveProject` fields — zero additional fetches),
  // feeding the new compact-tier caption line below alongside `detailed`'s
  // existing four-cell grid.
  const standard = standardMetrics(project);
  // PR-087 — a real, detectable condition: every one of the four standard
  // fields has no value at all (not "some missing," which stays exactly as
  // it was — a per-field "Not Tracked" is still the honest, correct label
  // for a single absent metric sitting beside three real ones). Only in
  // this total-absence case does repeating "Not Tracked" four times in a
  // row read as noise rather than information, so only this case gets the
  // unified empty state below.
  const allStandardMissing = standard.length > 0 && standard.every((field) => !field.value);
  // PR-085.02A, Objective 1 — 7-day change preferred, 24-hour as fallback,
  // reusing MetricItem's existing "—" fallback when neither is available.
  // Independent of `metric`'s own Price-only `changePct24h`: this reads the
  // market's real momentum figures directly, so it isn't gated on which
  // field ended up as the primary metric.
  const momentumPct = market.changePct7d ?? market.changePct24h;
  const momentumLabel = market.changePct7d !== null ? "7D" : "24H";
  // PR-086.04 — `compact`'s single-value momentum tile still only ever
  // reads 7D/24H (unchanged); `detailed`'s interactive switch also offers
  // 30D, so its own gate below additionally checks `changePct30d` — a
  // project with real 30-day data but no 24h/7d figure still gets a real
  // switch instead of no cell at all.
  const showMomentum = momentumPct !== null;
  const showDetailedMomentum = momentumPct !== null || market.changePct30d !== null;
  // PR-085.10 — always exactly 3 fields, always rendered, regardless of
  // data availability: a missing field gets its own honest, never-
  // fabricated placeholder (`COMPACT_METRIC_UNAVAILABLE`) instead of being
  // dropped — dropping fields (PR-085.09's behavior) let the footer shrink
  // or disappear entirely for projects like ether.fi Stake/Steakhouse
  // Financial/Spiko, breaking the "identical footer height on every card"
  // requirement this exists to fix. Still the same `standardMetrics()`
  // values, still never fabricated — only whether an absent field is
  // hidden or shown as a labeled gap changed.
  const compactStandardFields = isCompact
    ? standard.slice(0, 3).map((field) => ({
        label: COMPACT_METRIC_LABEL[field.label] ?? field.label,
        value: field.value ?? COMPACT_METRIC_UNAVAILABLE[field.label] ?? "—",
        unavailable: !field.value,
      }))
    : [];

  // PR-085.03, Requirement 9 — real links only, `detailed` only; a
  // discovery-only card's `identity.socials` is honestly thinner (only
  // twitter/discord/telegram/farcaster ever populated, see `build.ts`), so
  // it naturally shows fewer icons rather than any being faked.
  const socialCandidates: [keyof typeof SOCIAL_BRANDING, string | null][] = !isCompact
    ? [
        ["website", identity.websiteUrl],
        ["x", identity.socials.twitter],
        ["discord", identity.socials.discord],
        ["telegram", identity.socials.telegram],
        ["farcaster", identity.socials.farcaster],
        ["medium", identity.socials.medium],
      ]
    : [];
  const socialLinks = socialCandidates.filter((entry): entry is [keyof typeof SOCIAL_BRANDING, string] => Boolean(entry[1]));

  const cardBody = (
    <div
      className={cn(
        // PR-085.xx premium hover polish — `duration-300 ease-out` (was
        // `duration-200`, no easing curve) for a visibly smoother settle;
        // the peer-hover shadow's blur/opacity both increased slightly
        // (50px/0.12-0.15 -> 60px/0.16-0.20) for a more noticeable but
        // still soft lift, matching the rest of this pass's "stronger, not
        // flashy" direction. Nothing here fires without `:hover`/`:focus`
        // (no `motion-reduce` regression — the existing `motion-reduce:`
        // guards below are untouched).
        // Layout Engine audit — `h-full` (height: 100%) removed for
        // `detailed`, kept for `compact` (curated rails, unaudited here).
        // `h-full` on this element meant its rendered height always equaled
        // whatever the surrounding CSS Grid computed for its row — normally
        // harmless "stretch to match the tallest card" behavior, but
        // confirmed live to occasionally produce a genuinely wrong track
        // size: two groups of cards with byte-identical content (verified
        // by measuring each one's true height in isolation, outside the
        // grid) rendered at a persistent 24px difference in-grid, on every
        // reload, that no combination of removing `mt-auto` or forcing a
        // reflow fixed — a real browser quirk in how percentage-height
        // grid items with this component's specific nested-flex/absolute-
        // overlay structure interact with grid auto-row-sizing. Since every
        // section this card renders now has its own fixed, audited height,
        // there is no legitimate reason left for this element to depend on
        // its row's computed size at all — its own natural height (content
        // + fixed gaps + padding) is already exactly what every card in the
        // same data-completeness state should show. Removing the
        // dependency removes the ambiguity that produced the bug.
        isCompact ? "flex h-full flex-col" : "flex flex-col",
        "rounded-2xl border bg-gradient-to-b from-radar-light-card/90 to-radar-light-surface/70 shadow-[0_1px_2px_rgba(16,34,58,0.04)] backdrop-blur-xl dark:bg-gradient-to-b dark:from-radar-elevated/60 dark:to-radar-card/70 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        isCompact ? "gap-3 p-4" : "gap-3.5 p-5",
        // UI Interaction Polish — the hover treatment (elevation, not a
        // border/color change) now lives on this element's wrapper (see
        // `pointer-events-none relative z-[1]` below), the actual direct
        // sibling of the full-bleed `.peer` Link. This element's own border
        // is just its normal, unhovered rest state.
        isDiscoveryOnly ? "border-dashed border-radar-light-border/80 dark:border-white/15" : "border-radar-light-border dark:border-radar-border",
        className
      )}
    >
      {/* Row 1 — Identity: "What is this?" (§6). WatchButton renders as a sibling overlay outside this tree, not here — see the bottom of this file (§17, PR-2B).
          V1-FIX-019 — the social-icon row that used to render directly below
          this block (PR-085.05's "one tightly-spaced cluster" with Identity)
          has been relocated near the bottom of the card, after Standard
          Metrics — see that block's own doc comment for why. This wrapper
          now contains only the logo/name row; `gap-1` is harmless with a
          single child and was left untouched per this fix's own "hierarchy
          only" scope. */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          {/* UI Interaction Polish — the `peer-hover:scale-[1.03]` this
              carried was dead: `ProjectLogo` here is a descendant of
              `cardBody`, itself one level deeper than a direct sibling of
              `.peer` — the same nesting Tailwind's `peer-hover:` selector
              requires, and the same root cause the card's own border-hover
              effect had (see the elevation wrapper's doc comment below).
              Verified live (`getComputedStyle(...).scale` unchanged across
              a real hover) before removing rather than repairing it — the
              current spec calls for exactly one hover reaction (elevation),
              not per-element glows layered on top. */}
          <ProjectLogo
            logoUrl={identity.logoUrl}
            fallbackUrls={identity.logoUrlFallbacks}
            name={identity.name}
            size={isCompact ? 32 : 40}
          />
          <span
            title={identity.name}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            {identity.name}
          </span>
        </div>
      </div>
      {/* V1-FIX-010 — "why does this project matter" moved here from the
          card's very last row (unchanged content/markup, purely relocated):
          an executive-intelligence card's one "why" phrase read last, after
          every badge/metric a viewer already had to parse, effectively
          never seen at a glance. Same single truncated line, same
          `ecosystemRoleTag()` call, same real-fields-only contract, same
          unconditional (non-`min-h`-reserved) render — moving it changes
          nothing about the card's total height, only when in the reading
          order it appears. Placed right after Identity (not inside it) so
          Identity's own tight `gap-1` cluster (name + social row) stays
          exactly as scoped. */}
      {!isCompact && (
        <p
          className={cn(
            "text-[11px] font-medium text-radar-primary",
            // V1-FIX-004/009 — a real `statusReason` (see `roleTagOrReviewReason`'s
            // own doc comment) is a full evidence sentence, not a short tag —
            // truncating it to one line would hide the exact evidence a
            // reviewer opened this card to read. Every other status keeps the
            // existing single-line `truncate` behavior, unchanged.
            project.discoveryStatus === "needs-review" && project.discoveryEvidence?.statusReason ? "line-clamp-2" : "truncate"
          )}
        >
          {roleTagOrReviewReason(project)}
        </p>
      )}
      {!isCompact && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ChainBadgeGroup chains={chains} size="sm" max={1} className="flex-nowrap" />
          <span className="flex items-center gap-1 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/5 dark:text-radar-muted">
            {CATEGORY_BRANDING[project.category].label}
          </span>
        </div>
      )}

      {/* Row 2 — Trust: "Can I trust it?" (§6, §10). At `compact`, Status and
          Risk merge in here too (§14's row cap: 4 rows — Identity,
          Trust+Status+Risk merged, Score, Metric) — passed as props now,
          not rendered as separate flat siblings, so `TrustIndicators` can
          own the fixed two-column grid that keeps Risk's X position
          independent of the verification badge's width (see that
          component's own doc comment). */}
      {isCompact ? (
        <TrustIndicators
          project={project}
          isCompact
          riskLevel={riskLevel}
          status={project.status}
          discoveryStatus={project.discoveryStatus}
        />
      ) : (
        <TrustIndicators project={project} isCompact={false} />
      )}

      {/* Row 2b — Risk + Lifecycle: "Anything urgent I should know before I
          read further?" (§6-8, Final UI/UX Consistency PR §2's information
          hierarchy — Verification → Confidence → Risk, in that order,
          before AI Recommendation/Metrics). Formerly rendered as `detailed`'s
          own "Row 5" near the bottom of the card, after the Score and Metric
          rows — `compact` already merged Risk into Trust's own right column
          (immediately after Confidence), so the two variants disagreed on
          where Risk sits relative to AI Recommendation: earlier on `compact`,
          later on `detailed`, on byte-identical data. That's the template
          dictating badge order, the exact thing §10 rules out — data alone
          should decide it. Moved here, directly under Trust, so both variants
          now agree: Risk is always the signal read immediately after
          Verification/Confidence, never after the card has already stated
          its metrics or AI recommendation. */}
      {!isCompact && (
        <div className="flex flex-wrap items-center gap-1.5">
          <RiskBadge riskLevel={riskLevel} contributors={riskContributors} />
          <ProjectStatusBadge status={project.status} discoveryStatus={project.discoveryStatus} />
          {/* V1-FIX-017 — real risk evidence, visible without a hover, only
              when the card's own risk level is genuinely elevated (never for
              "low" — unchanged there) and only when a real high/moderate-
              severity factor exists to name. `min-w-0 truncate` lets this
              shrink and ellipsize within the row's existing `flex-wrap`
              instead of ever forcing a second line — no height reservation
              needed since `ProjectStatusBadge` already renders nothing for
              the common `"live"` status, the exact dead space this reuses. */}
          {riskConcern && (
            <span className="min-w-0 truncate text-[10.5px] text-radar-light-muted dark:text-radar-muted">· {riskConcern}</span>
          )}
        </div>
      )}

      {/* Row 3 — Score: "Is it healthy?" (§6, §11). §13 requires the AI Rating grade to be one of exactly two Rank-1 elements, matching the primary metric's own size. PR-085.03B, Finding 3 — the Recommendation phrase (reusing the exact existing `RECOMMENDATION_FOR_RISK` vocabulary, unchanged) is now its own labeled block instead of trailing inline text, so it reads as a first-class executive signal rather than a caption. Still the same row/position — not moved elsewhere on the card.
          V1-FIX-021 — Typography & Visual Emphasis. §13's parity claim above
          was previously false in practice: `MetricItem`'s `emphasize` prop
          produces `text-2xl` for the Primary Metric value (via this file's
          own `valueClassName="text-2xl"` override, added after this span was
          last touched), while this grade span was still `text-xl` — one real
          Tailwind step smaller, confirmed by direct code comparison, not
          assumed. Bumped to `text-2xl` so the two documented Rank-1
          elements are actually the same size. Wording/comment-only
          correction above; the fix itself is the single className token
          change on the span below. */}
      {/* PR-086 — a fixed-width grade column + a flexible right column
          (label above value), matching the target "Bloomberg terminal
          recommendation block" layout exactly — not just grade-then-
          inline-text (the prior pass's shape). `items-center` vertically
          centers the grade against the two-line text block beside it.
          `w-9`/`isCompact ? "w-7"` gives every card's grade the same
          column width regardless of whether it's one or two characters
          ("A" vs "A+"), so the text column's left edge lines up card to
          card — a real, deliberate alignment choice, not incidental. */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "shrink-0 text-radar-light-text dark:text-radar-white",
            isCompact ? "w-7 text-sm font-semibold" : "w-9 text-2xl font-bold tracking-tight"
          )}
        >
          {aiRating ?? "—"}
        </span>
        {/* PR-087 — always reserves this space (`recommendation` is `null`
            for every discovery-only project, non-null for every registry
            project — a structural split by `project.source`, not
            occasional missing data), but no longer renders an isolated
            dash beside an `invisible` block: an honest muted placeholder
            fills the same two-line slot instead, so every card in a grid
            keeps the identical row height regardless of data coverage,
            and there's never a lone "—" floating with nothing beside it. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md">
          <span className="truncate text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            AI Recommendation
          </span>
          <span
            className={cn(
              "truncate text-xs font-medium",
              recommendation ? "text-radar-light-text dark:text-radar-white" : "text-radar-light-muted dark:text-radar-muted"
            )}
          >
            {/* Product Semantics audit — "No recommendation available yet"
                implied a future state ("yet") that's misleading here:
                `recommendation` is `null` because this is a discovery-only
                project the intelligence engine structurally never runs for
                (see the doc comment above), not a value that's still being
                computed. "No Recommendation" states the honest, current
                fact without promising one is coming. */}
            {recommendation ?? "No Recommendation"}
          </span>
        </div>
      </div>

      {/* Row 4 — Metric: "How big is it, and where does it rank?" (§6, §9). PR-085.03, Requirement 5 — `detailed` always shows exactly five values: the primary here (7-day momentum folded in as an inline annotation, not a sixth tile) plus the four-cell Standard Metrics grid below.
          PR-085.05A, Task 2 — `compact`'s momentum tile is back to the plain
          "7D"/"24H" label, value/calc/color untouched.
          PR-085.05B — reverts PR-085.05A's three-row metric list back to one
          line (rapid-comparison density on a curated rail outweighs the
          extra structure). Abbreviated labels only ("MCap"/"Vol"), same real
          values, same formatter. */}
      {isCompact ? (
        // PR-086.04 — always `grid-cols-2`, never collapses to one column:
        // a project with no 24h/7d momentum still gets an honest "Not
        // Available" placeholder in the second cell instead of the primary
        // metric silently stretching to fill the row — the same "never
        // collapse the layout" rule the detailed grid above now follows.
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label={metric.label} value={metric.value} unavailableLabel="Not Tracked" bare />
          {showMomentum ? (
            <MetricItem label={momentumLabel} changeValue={momentumPct} bare />
          ) : (
            <MetricItem label="Change" value={undefined} unavailableLabel="Not Tracked" bare />
          )}
        </div>
      ) : (
        <>
          {/* PR-086 — the card's one true "hero metric," now a real
              two-equal-column layout (was a single cell with the change
              annotated inline next to the value) — the same
              `showMomentum ? grid-cols-2 : grid-cols-1` shape `compact`'s
              own primary+momentum pair already uses a few lines below,
              just scaled up: left is the primary value, right is 7D/24H
              momentum as its own independent metric, never attached
              percentage text. `valueClassName="text-2xl"` on both cells
              (via `MetricItem`'s newly-shared handling for `changeValue`
              too) keeps them visually balanced — neither reads as more
              important than the other purely from size. This override is
              local to this one call site; every other `emphasize` consumer
              elsewhere in the app is untouched. */}
          <div
            className={cn(
              // `[&_.text-2xl]`, not `[&_span]` — targets only the large
              // value spans (via the `valueClassName="text-2xl"` passed
              // below), never the small muted uppercase labels beside them.
              //
              // Layout Engine audit — `min-h-[108px]` (was 88px). This row
              // had no reserved height at all originally; 88px matched the
              // both-cells-empty case when the placeholder text was a
              // single line ("Not Tracked"). Product Semantics audit's
              // truncation fix (`MetricItem`, wraps an unavailable label
              // onto two lines instead of clipping "Not Trac...") made that
              // case genuinely taller when BOTH cells wrap simultaneously —
              // confirmed live: 107.75px real height against the old 88px
              // reservation, a fresh ~20px gap reintroducing the exact same
              // class of bug this reservation exists to prevent. Re-measured
              // and updated, not patched with an arbitrary buffer.
              //
              // V1-FIX-001, second pass — `soloCard` drops the reservation
              // (see this file's own `LiveProjectCardProps.soloCard` doc
              // comment): only `ProjectSpotlight` ever passes it, and only
              // because it's the one caller that never renders this card
              // beside a sibling.
              soloCard ? "grid grid-cols-2 gap-3" : "grid min-h-[108px] grid-cols-2 gap-3"
            )}
          >
            <MetricItem label={metric.label} value={metric.value} unavailableLabel="Not Tracked" emphasize valueClassName="text-2xl" />
            {/* PR-086.03 — the same momentum cell, made interactive: a real
                24H/7D/30D switch instead of an auto-picked static label.
                PR-086.04 — always renders this cell, never collapses the
                grid to one column when no window has data (a real, honest
                "Not Available" placeholder fills the same slot instead) —
                matching every other metric on this card, none of which
                shrink the layout for a missing value. */}
            {showDetailedMomentum ? (
              <LiveProjectCardMomentum market={market} valueClassName="text-2xl" />
            ) : (
              <MetricItem label="Performance" value={undefined} unavailableLabel="Not Tracked" emphasize valueClassName="text-2xl" />
            )}
          </div>
          {/* PR-084.xx — reverts PR-085.11's 4-column row back to 2×2.
              PR-085.11 chose one row specifically to avoid the card-height
              cost of a second row; re-measured live, that one row's real
              cost was a readability defect it didn't anticipate: at the
              Full Directory's own `lg:grid-cols-3` breakpoint (a common
              1024-1400px desktop width), this grid narrows to ~259px total
              (~59px/cell), and "24H Volume" — the one four-letter-longer
              label — wraps to two lines there while its three siblings
              don't, confirmed live via direct DOM measurement. 2×2 gives
              each cell roughly double that width (~130px), comfortably
              fitting every label on one line at every width this card
              actually renders at (verified at 375/768/1280/1440px). Same
              four fields, same order, same `MetricItem`; only the column
              count changed and Market Cap's own size grew (see
              `STANDARD_METRIC_EMPHASIS` above) to use the freed width
              deliberately rather than leave it empty. */}
          {standard && (
            // Layout Engine audit — `min-h-[88px]` added: live measurement
            // across a real collection page found the "all missing"
            // collapsed state below actually rendered at 58px against the
            // populated grid's real 87-88px, a 30px gap this section's own
            // prior doc comment claimed didn't exist ("spans the same 2×2
            // footprint... matches a card whose grid is populated" — false,
            // confirmed by measuring both states side by side). That gap
            // cascaded into every section below — Status/Risk badges,
            // footer — landing at a different Y position on a discovery-
            // only card (which always hits the collapsed branch) than a
            // registry card with real market data. The reservation now
            // lives on this section's own container, sized to its real
            // populated height, so both branches occupy identical space
            // regardless of which one actually renders.
            <div className="grid min-h-[88px] grid-cols-2 gap-2 rounded-lg">
              {allStandardMissing ? (
                // PR-087 — one honest, unified empty state instead of
                // "Not Tracked" repeated in all four cells; the parent's
                // `min-h-[88px]` (above) is what actually guarantees this
                // matches the populated grid's footprint — centered within
                // that reserved space via `justify-center` on the full-
                // height flex column below, not by this block's own size.
                <div className="col-span-2 flex h-full flex-col items-center justify-center gap-0.5 text-center">
                  {/* Product Semantics audit — was "Market Data / Not
                      available yet," which read as contradicting the hero
                      metric row directly above it (e.g. a real "TVL: $17.3B"
                      right next to "Market Data unavailable"). Both rows
                      look like one homogeneous "market" reading to a viewer,
                      but they're two different providers: the hero metric
                      can be TVL (DefiLlama), while this grid is always
                      CoinGecko's own per-token fields (Market Cap, Price,
                      24H Volume, FDV) — traced in `standardMetrics()`,
                      `lib/projects/primaryMetric.ts`. "Price Data" names
                      the actual missing source; "Not Tracked" matches the
                      exact wording every other empty cell on this card
                      already uses (`MetricItem`'s `unavailableLabel`
                      default), instead of a third, inconsistent phrase. */}
                  <span className="text-[10.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                    Price Data
                  </span>
                  <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">Not Tracked</span>
                </div>
              ) : (
                standard.map((field) => (
                  <MetricItem
                    key={field.label}
                    label={field.label}
                    value={field.value}
                    unavailableLabel="Not Tracked"
                    bare
                    valueClassName={STANDARD_METRIC_EMPHASIS[field.label]}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
      {/* PR-085.08 — bottom-anchored (`mt-auto`, the exact precedent
          `detailed`'s own `ecosystemRoleTag` paragraph below already uses)
          so it sits at the same vertical position on every compact card
          regardless of how much variable-height content sits above it.
          Divider (`border-t`) + `pt-2.5` (10px) unchanged since PR-085.08.
          PR-085.10 — always renders (no data-availability gate): a project
          with no real Market Cap/Price/Volume read now shows the same
          3-column grid with honest per-field placeholders instead of a
          shrunken or missing footer, so every compact card's footer is the
          same height at the same position regardless of data coverage.
          Left-aligned per the approved spec (was centered in PR-085.09);
          an unavailable cell's value renders muted, the same "honest gap"
          treatment `MetricItem`'s own `unavailableLabel` already uses
          elsewhere on this card — not a new convention. */}
      {isCompact && (
        <div className="mt-auto grid grid-cols-3 gap-1 border-t border-radar-light-border/60 pt-2.5 dark:border-white/[0.06]">
          {/* PR-087 — same unified empty state as the detailed grid above,
              for the same reason: three "Not Tracked" cells in a row reads
              as noise, one honest line reads as information. Spans all 3
              columns so the footer's own height is unchanged either way. */}
          {compactStandardFields.every((field) => field.unavailable) ? (
            <span className="col-span-3 text-left text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">
              Price data not tracked
            </span>
          ) : (
            compactStandardFields.map((field) => (
              <div key={field.label} className="flex flex-col items-start gap-0.5">
                <span className="w-full truncate text-left text-[9px] font-medium tracking-wide text-radar-light-muted dark:text-radar-muted">
                  {field.label}
                </span>
                <span
                  className={cn(
                    "w-full truncate text-left text-[10px] font-medium whitespace-nowrap tabular-nums",
                    field.unavailable ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white"
                  )}
                >
                  {field.value}
                </span>
              </div>
            ))
          )}
        </div>
      )}
      {/* V1-FIX-019 — Executive Information Hierarchy. Relocated here,
          verbatim, from directly under Identity (PR-085.05's original
          position). Investigation finding: Social Icons is the single
          lowest executive-decision-value element on this card (pure
          reference links — website/X/Discord/etc. — never a trust, risk, or
          recommendation signal), yet it previously rendered second, ahead of
          Risk, Recommendation, and every other higher-value row. Moved next
          to Category Rank, the card's other Reference-tier item, at the
          bottom where its actual decision value belongs. Chain/Category
          deliberately stays in its original position (unlike this row, it
          still serves a real early fast-filter scan — "is this a Base
          DEX?" — that justifies staying early even though it's also
          Reference-tier). No other row moved. The block itself — markup,
          classNames, `min-h-6` reservation, real-links-only filtering — is
          byte-identical to its old position; only its place in the tree
          changed, so total card height and every other row's position are
          unaffected. */}
      {/* PR-085.03, Requirement 9 — real links only. `pointer-events-auto`
          re-enables hit-testing that the wrapping content layer (see the
          bottom of this file) turns off, since these are the one real `<a>`
          this component renders inside the card body.
          PR-084.xx — always reserves one icon-row's height (`min-h-6`,
          matching each icon's own `size-6`) on `detailed`, whether or not
          any real social link exists: a registry project's `websiteUrl`
          is a required registry field, so it always has at least one
          icon; a discovery-only project's is honestly optional and often
          absent. Reserves one row only, never worst-case-6-icons space:
          6 icons at `size-6` + `gap-1.5` is well under a real card's
          width, so wrapping to a second row essentially never happens in
          practice — reserving more than one row's height would be
          speculative for a case that doesn't occur. */}
      {!isCompact && (
        <div className="pointer-events-auto flex min-h-6 flex-wrap items-center gap-1.5">
          {socialLinks.map(([platform, href]) => {
            const { Icon, label } = SOCIAL_BRANDING[platform];
            if (!Icon) return null;
            return (
              <a
                key={platform}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                // PR-085.05, Task 4 — default 60% opacity, full on hover.
                // Opacity, not color, is the real lever here: `BrandIcons.tsx`'s
                // marks are hard-coded brand-hex fills, not `currentColor`, so
                // the existing text-color hover barely affects the icon itself.
                className="flex size-6 items-center justify-center rounded-full border border-radar-light-border text-radar-light-muted opacity-60 transition-[color,border-color,opacity] hover:border-radar-primary/40 hover:text-radar-light-text hover:opacity-100 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-border-hover dark:hover:text-radar-white"
              >
                <Icon className="size-3.5" />
              </a>
            );
          })}
        </div>
      )}
      {categoryRank && (
        <p className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
          #{categoryRank.rank} of {categoryRank.total} in {CATEGORY_BRANDING[project.category].label}
        </p>
      )}
    </div>
  );

  // Discovery-only projects have `slug: null` — no Project Profile route
  // exists for them yet (PR-055 §7's open question, deliberately deferred).
  // Never link to a fabricated or 404 destination. They also never render
  // WatchButton (gated below), so the invalid-nesting concern this branch
  // exists to avoid never applies to them in the first place.
  //
  // Layout Engine audit — still wrapped in the identical two-level `relative
  // h-full` / `pointer-events-none relative z-[1] h-full` structure the
  // slugged branch below uses (just without the `Link`/rainbow-ring/
  // `WatchButton` a discovery-only card genuinely can't have). Previously
  // this branch returned `cardBody` completely bare, one level shallower
  // than every registry card — confirmed live that this structural
  // difference (not any difference in `cardBody`'s own content, which
  // measured byte-identical between a registry and discovery card in
  // isolation) was what made the browser compute a different intrinsic
  // height for the two groups, cascading into every discovery-only card in
  // a grid row landing 24px shorter than its registry-card neighbors.
  // Matching the wrapper depth exactly — not touching `cardBody` itself —
  // is what actually fixes it.
  if (!project.slug) {
    return (
      <div className="relative h-full">
        <div className="pointer-events-none relative z-[1] h-full">{cardBody}</div>
      </div>
    );
  }

  return (
    // UI Interaction Polish — `hover:z-20` here (not `peer-hover:`, since
    // this element is `.peer`'s own parent, not a sibling) lifts the whole
    // card, on hover, above its neighboring grid cells — each card's outer
    // wrapper is otherwise `z-index: auto` with no other stacking order
    // between siblings, so without this the elevated shadow/scale below can
    // render clipped under (or clipping) an adjacent card. Plain `hover:`
    // is equivalent to `.peer`'s own hover state here since the Link is an
    // exact `absolute inset-0` overlay of this same box.
    //
    <div className={cn(isCompact ? "h-full" : undefined, "relative hover:z-20")}>
      {/* §21 accessible name: the card's own text content would otherwise
          concatenate every row into one unwieldy string; `aria-label` makes
          the accessible name exactly the project name, matching §21's rule
          verbatim ("the card's accessible name is the project name, never
          'click here'"). PR-085.03 — now a full-bleed `peer` overlay
          positioned *behind* the visible content (`z-0`, empty — its only
          job is to be the click/focus target) rather than a wrapper
          *around* it, so the new social-icon row below (a real `<a>`)
          never nests inside this one (see this file's top-of-file doc
          comment for why that's a real, not just cosmetic, problem). An
          ordinary click anywhere on the content still reaches this Link,
          since the content layer is `pointer-events-none` and this is the
          only `pointer-events-auto` layer beneath it. */}
      <Link
        href={`/dashboard/projects/${project.slug}`}
        aria-label={identity.name}
        className="peer absolute inset-0 z-0 block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
      />
      {/* UI Interaction Polish — elevation hover effect lives here, not on
          `cardBody` inside: this element is the actual direct sibling of
          `.peer` (`cardBody` itself is one level deeper), which is what
          Tailwind's `peer-hover:` selector requires to match at all — verified
          live that the previous `peer-hover:` classes on `cardBody` never
          fired for exactly this reason (confirmed via computed-style
          comparison across a real hover, zero change either state). Replaces
          the old border-color change (competed visually with card content)
          with a modern elevation effect: scale + lift + shadow + a slight
          brightness lift, no border/outline/color change, rounded corners
          unaffected (the scale keeps them proportional). `brightness-105`
          is a `filter`, not a `background-color` — it visually brightens
          everything painted inside this element (including `cardBody`'s own
          gradient background nested inside it) without needing `cardBody`
          itself to be peer-hover-reactive, which it structurally can't be
          here. `motion-reduce:` nulls only the transform, not the shadow/
          brightness/z-index, matching this codebase's existing convention
          (`CategoryRail.tsx`'s own hover lift). */}
      <div
        className={cn(
          // UI Polish (Command Center pass) — `h-full` here must match
          // `cardBody`'s own condition exactly (`isCompact ? "h-full" :
          // ""`), not be unconditional. Root-caused a real "extra
          // whitespace below hovered cards" bug: `detailed` `cardBody` is
          // deliberately its own natural content height, never stretched
          // (see the Layout Engine audit comment on `cardBody`'s own
          // className below) — but this wrapper previously forced `h-full`
          // regardless, stretching it to the grid row's tallest-sibling
          // height. Harmless while invisible, but the hover shadow/scale
          // below paints this wrapper's full (taller, empty-at-the-bottom)
          // box, not `cardBody`'s real visible bounds — confirmed live via
          // `getBoundingClientRect()`: `cardBody` measured 557px tall,
          // this wrapper 582px, a 24px gap the elevation shadow rendered
          // into as visible empty space under the actual card content.
          isCompact ? "h-full" : undefined,
          "pointer-events-none relative z-[1] rounded-2xl transition-[transform,filter] duration-200 ease-out motion-reduce:transition-none",
          // Bug fix — `soloCard` (`ProjectSpotlight`, the only caller) also
          // now gates this wrapper's own hover elevation, not just the
          // metric-grid reservation `soloCard` originally existed for. Root
          // cause, confirmed live via a real screenshot: `cardBody` inside a
          // `soloCard` has its own background/border/shadow stripped at rest
          // (`SPOTLIGHT_CARD_CLASS`, in `ProjectSpotlight.tsx`) so it blends
          // seamlessly into the surrounding `WidgetCard` — but this wrapper's
          // `peer-hover:` scale/shadow below were never part of that
          // stripping (they live one level out from `cardBody`, untouched by
          // its `className` prop). On hover, that meant a rounded box with a
          // real shadow suddenly appeared out of nowhere, sized to only
          // `cardBody`'s own footprint (roughly logo through the metrics
          // grid) — not the full widget, since the `WidgetCard` header/
          // footer around it belong to a different element entirely and
          // never moved with it. Skipping the hover classes here for
          // `soloCard` and instead letting `WidgetCard`'s own generic
          // `whileHover={{y:-3}}` lift the WHOLE widget (see
          // `ProjectSpotlight.tsx`'s removed `disableHoverLift` — that prop
          // was added specifically because THIS wrapper's hover used to look
          // "richer," before this same bug was understood) makes hovering
          // Project Spotlight lift one seamless unit, matching what
          // `SPOTLIGHT_CARD_CLASS` already does for the REST state.
          !soloCard &&
            cn(
              // UX Polish, Part 8 — 1.015 read as "slightly aggressive" per
              // direct feedback. Tuned down to 1.008, the subtlest of the three
              // candidates evaluated (1.008/1.01/1.012) — at this card's real
              // rendered width (~300px), the difference between candidates is
              // 2.4px vs 3px vs 3.6px of growth, all genuinely subtle; chose the
              // most restrained end of that range to match the reference
              // products named (Linear/Vercel/Notion/Raycast/Arc), all known
              // for minimal, non-flashy hover states rather than a pronounced
              // "pop." Verified live: still clearly perceptible against the
              // lift/shadow/brightness together, not imperceptibly small on its
              // own.
              "peer-hover:scale-[1.008] peer-hover:-translate-y-0.5 motion-reduce:peer-hover:scale-100 motion-reduce:peer-hover:translate-y-0",
              "peer-hover:brightness-105",
              "peer-hover:shadow-[0_16px_32px_-12px_rgba(16,34,58,0.25)] dark:peer-hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.5)]"
            )
        )}
      >
        {cardBody}
      </div>
      {/* Final Premium UX Polish — removed the rainbow hover ring that used
          to render here. It was a genuine direct sibling of `.peer` (unlike
          the dead effects removed elsewhere in this file), so it *did*
          fire, but it never moved with the elevation wrapper's `scale`/
          `-translate-y-0.5` above — verified live: on hover, the ring's own
          rect stayed at the card's resting bounds while the actual
          (now-elevated) card visibly grew past it on every edge, reading as
          a border poking out past the card rather than framing it. The
          current spec is explicit — elevation only, no border/outline/glow
          color change — so this is removed rather than re-synced to the
          new transform. */}
      {/* PR-2B (§17) — rendered as a sibling overlay, not a Link descendant:
          a <button> nested inside an <a> is invalid HTML and was breaking
          §17's "never nested inside the navigation link" rule. `!size-11`
          (44px, `!` overrides WatchButton's own smaller `size-7`/`size-8`)
          gives it a real 44×44 touch target per §21 without modifying the
          shared `WatchButton` component itself — the icon inside stays the
          same visual size, only the tappable area grows. Watching requires
          a stable registry project id — never offered on a discovery-only
          card, per PR-055 §7 (already guaranteed here: this branch only
          runs when `project.slug` exists, which discovery-only projects
          never have). */}
      {/* PR-085.xx premium hover polish — `peer-hover:text-radar-light-text`
          brightens the star slightly when the card itself is hovered (not
          just when the star is directly hovered, which `WatchButton`'s own
          `hover:text-radar-warning` already handles) — additive to, not a
          replacement for, its existing hover/focus/watched states. */}
      {/* Bug fix — `absolute` used to live on `WatchButton`'s own className,
          which only reaches the `<button>` inside `Tooltip`'s trigger
          (`components/ui/Tooltip.tsx`'s `<span className="inline-flex items-center">`
          wrapper around it, needed for real anchoring — `display: contents`
          there breaks the tooltip's position, per that file's own comment).
          That span itself was never positioned, so it stayed a normal
          in-flow inline-level box directly inside this card's `outerWrapper`
          (`div.relative.hover:z-20` above), sitting on its own line right
          after the elevation `div`. Per CSS2.1 §10.8, an inline box on a
          line still gets a "strut" — height reserved from the container's
          inherited font/line-height — even when its own content (the
          absolutely-positioned button) is visually zero-height. Live-
          confirmed on the Dashboard's Project Spotlight: `outerWrapper`
          measured 482px against the card's real 458px content, a 24px gap
          matching this exact line-height. Moving `absolute` to a wrapper
          `div` here takes the whole subtree — span included — out of flow,
          so no line box, no strut, no gap. */}
      <div className={cn("absolute z-10", isCompact ? "top-2.5 right-2.5" : "top-3.5 right-3.5")}>
        <WatchButton
          projectId={project.id}
          projectName={identity.name}
          size="sm"
          className="!size-11 transition-colors duration-300 peer-hover:text-radar-light-text dark:peer-hover:text-radar-white"
        />
      </div>
    </div>
  );
}
