/**
 * PR-085.02 — pure derivations for the Executive Dashboard's summary strip.
 * Every function here is a template/rollup over data another already-
 * `cache()`-wrapped aggregate function computed (`getKpis()`, `getExecutiveSnapshot()`,
 * `getNarrativeHeatmap()`) — no new provider call, no new scoring model.
 * Same "real numbers in, plain-English text out" discipline `lib/brief/summary.ts`
 * already established for the Watchlist-scoped Daily Brief, applied here to
 * ecosystem-wide inputs instead.
 */

import { formatCompactCurrency, formatCompactNumber, formatRelativeTime } from "@/lib/data/format";
import { getProject } from "@/data/projects/helpers";
import type { Kpi, KpiId, NarrativeHeatRow } from "@/lib/data/types";
import type { GovernanceEvent } from "@/lib/governance";
import type { WhaleEvent } from "@/lib/whale";
import type { VerifiedContract } from "@/lib/providers/blockscout/service";
import type { RepoStats } from "@/lib/providers/github/service";

export type MarketSentiment = "Bullish" | "Neutral" | "Bearish";

export type SentimentReading = {
  sentiment: MarketSentiment;
  /** e.g. "3 of 5 tracked categories trending up" — the real count behind the label, never asserted without it. */
  justification: string;
};

/**
 * Rolls up `NarrativeHeatRow[]`'s already-computed per-category `momentum`
 * (`lib/data/types.ts`'s `NarrativeHeatRow`, fed by `getNarrativeHeatmap()`)
 * into one ecosystem-wide reading — majority vote on real per-category
 * trend direction, not a new momentum calculation. `null` when there's
 * nothing to roll up (never a fabricated "Neutral" for zero real data).
 */
export function computeMarketSentiment(heatmap: NarrativeHeatRow[]): SentimentReading | null {
  if (heatmap.length === 0) return null;

  const up = heatmap.filter((row) => row.momentum === "up").length;
  const down = heatmap.filter((row) => row.momentum === "down").length;
  const total = heatmap.length;

  const sentiment: MarketSentiment = up > down ? "Bullish" : down > up ? "Bearish" : "Neutral";
  const direction = sentiment === "Bullish" ? "up" : sentiment === "Bearish" ? "down" : "flat";
  const count = sentiment === "Bullish" ? up : sentiment === "Bearish" ? down : total - up - down;

  return {
    sentiment,
    justification: `${count} of ${total} tracked categor${total === 1 ? "y" : "ies"} trending ${direction}`,
  };
}

/**
 * Presents the real verified-project ratio as an honest percentage rather
 * than collapsing it into one invented "Ecosystem Health" score — the same
 * anti-fabrication discipline every other composite in this codebase
 * follows. Live-verified fix: this originally read `RegistryMetrics.verified`
 * (the `verificationLevel` pipeline field, confirmed unset on every current
 * project — read live as a flat, uninformative 0%) and also showed an
 * "intelligence-ready %" line from the same unpopulated field; both are
 * gone. `verifiedCount` now comes from `ExecutiveSnapshot`'s own field,
 * which reads `project.verification.status` — the actual populated
 * editorial trust field this app already surfaces everywhere else.
 */
export function buildEcosystemHealthLines(verifiedCount: number, discoveredCount: number): string[] {
  if (discoveredCount === 0) return [];
  const verifiedPct = Math.round((verifiedCount / discoveredCount) * 100);
  return [`${verifiedPct}% of tracked projects verified`];
}

function findKpi(kpis: Kpi[], id: KpiId): Kpi | undefined {
  return kpis.find((kpi) => kpi.id === id);
}

export type ExecutiveHighlightCategory = "tvl" | "whale" | "governance" | "security" | "developerActivity";
export type ExecutiveHighlight = { id: string; category: ExecutiveHighlightCategory; text: string };

/** `end`, real proposal-close timestamp, minus now — matches `lib/alerts/providers/snapshot.ts`'s own `ENDING_SOON_WINDOW_DAYS` (3 days), reused here rather than a second threshold invented for this file. */
const GOVERNANCE_ENDING_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

/**
 * V1-FIX-006, Priority 4 (Governance) — real active proposals only, grouped
 * by the real project they belong to (`getProject(event.projectId)`, the
 * same registry lookup `getGovernanceTrackedProjects()` already uses to
 * build these events in the first place). The project with the MOST active
 * proposals wins the one available slot — ties broken by whichever has the
 * soonest-closing proposal, a real, deterministic tiebreak, never arbitrary
 * order. Mirrors the spec's own worked example ("Aerodrome has 2 governance
 * votes closing soon") when a project genuinely has more than one; a single
 * real proposal instead names it directly rather than restating a count of
 * one.
 */
function buildGovernanceHighlight(events: GovernanceEvent[]): ExecutiveHighlight | null {
  const active = events.filter((event) => event.status === "active");
  if (active.length === 0) return null;

  const byProject = new Map<string, GovernanceEvent[]>();
  for (const event of active) {
    const list = byProject.get(event.projectId) ?? [];
    list.push(event);
    byProject.set(event.projectId, list);
  }

  let bestProjectId: string | null = null;
  let bestEvents: GovernanceEvent[] = [];
  for (const [projectId, list] of byProject) {
    const soonestEnd = (candidate: GovernanceEvent[]) => Math.min(...candidate.map((e) => new Date(e.end).getTime()));
    if (
      bestProjectId === null ||
      list.length > bestEvents.length ||
      (list.length === bestEvents.length && soonestEnd(list) < soonestEnd(bestEvents))
    ) {
      bestProjectId = projectId;
      bestEvents = list;
    }
  }
  if (!bestProjectId) return null;

  const projectName = getProject(bestProjectId)?.name ?? bestEvents[0].projectId;

  if (bestEvents.length > 1) {
    return {
      id: `governance-${bestProjectId}`,
      category: "governance",
      text: `${projectName} has ${bestEvents.length} governance votes closing soon`,
    };
  }

  const event = bestEvents[0];
  const endingSoon = new Date(event.end).getTime() - Date.now() <= GOVERNANCE_ENDING_SOON_WINDOW_MS;
  return {
    id: `governance-${bestProjectId}`,
    category: "governance",
    text: `${projectName}: "${truncate(event.title, 42)}" ${endingSoon ? "closes soon" : "voting is active"}`,
  };
}

const TVL_NOTABLE_CHANGE_THRESHOLD_PCT = 5;

/**
 * V1-FIX-006A, Priority 2 (TVL movements) — the single largest real 24h TVL
 * move among tracked projects (`lib/data/aggregate.ts`'s `topTvlMover`,
 * resolved via `lib/intelligence/sources.ts`'s `findTopTvlMover` against
 * DefiLlama's already-fetched bulk protocol list — the same real name/
 * parent-tag matching Project Profile pages use, so a split protocol like
 * Aerodrome or Uniswap still resolves correctly). 24h, not 7d: DefiLlama's
 * bulk list only carries a 1-day change — a distinct real number from the 7d
 * figure `lib/alerts/providers/defillama.ts`'s client-only TVL alert
 * provider computes via a separate per-protocol history call this component
 * has no access to (see this file's own architecture-audit findings).
 */
function buildTvlHighlight(topTvlMover: { projectId: string; projectName: string; changePct24h: number } | null): ExecutiveHighlight | null {
  if (!topTvlMover || Math.abs(topTvlMover.changePct24h) < TVL_NOTABLE_CHANGE_THRESHOLD_PCT) return null;
  const up = topTvlMover.changePct24h >= 0;
  return {
    id: `tvl-${topTvlMover.projectId}`,
    category: "tvl",
    text: `${topTvlMover.projectName} TVL ${up ? "increased" : "decreased"} ${Math.abs(topTvlMover.changePct24h).toFixed(1)}% (24h)`,
  };
}

/**
 * V1-FIX-006, Priority 3 (Whale activity) — the single highest-value real
 * whale/large-transfer event, resolved to its real project name via
 * `getProject(event.projectId)` (`lib/whale`'s own `WhaleEvent.projectId`,
 * populated from the same registry-matched `WatchedToken` the detector was
 * given — never a guess). `events` is already sorted highest-value-first by
 * `getRawWhaleEvents()`'s own caller (`getWhaleEventsImpl`), but sorted
 * again here defensively since this function reads the raw, unsorted list
 * directly.
 */
function buildWhaleHighlight(events: WhaleEvent[]): ExecutiveHighlight | null {
  if (events.length === 0) return null;
  const top = events.slice().sort((a, b) => b.usdValue - a.usdValue)[0];
  const projectName = getProject(top.projectId)?.name ?? top.tokenSymbol;
  return {
    id: `whale-${top.id}`,
    category: "whale",
    text: `${projectName}: ${formatCompactCurrency(top.usdValue)} ${top.tokenSymbol} moved ${formatRelativeTime(top.timestamp)}`,
  };
}

/** V1-FIX-006, Priority 5/6 (Security / Contract verification) — the one real signal this codebase has for either (see `lib/discovery/status.ts`'s own V1-FIX-004 finding: "Contract Verified" is the only real security-category event any provider here produces). A newly-verified contract is real, positive, decision-relevant information, not a risk framed as one. */
function buildContractVerificationHighlight(contract: VerifiedContract | null): ExecutiveHighlight | null {
  if (!contract) return null;
  return { id: `verify-${contract.address}`, category: "security", text: `New contract verified: ${contract.name ?? "Unnamed contract"}` };
}

/** V1-FIX-006, Priority 7 (Developer activity) — Base's own core node repo, the one already-fetched GitHub source this dashboard reads (`PRIMARY_REPO`, `lib/data/aggregate.ts`) — real, but ecosystem-infrastructure-level, not a claim about any tracked project's own repo. */
function buildDeveloperActivityHighlight(repo: RepoStats | null): ExecutiveHighlight | null {
  if (!repo?.latestReleaseTag) return null;
  return { id: `dev-${repo.latestReleaseTag}`, category: "developerActivity", text: `${repo.fullName} released ${repo.latestReleaseTag}` };
}

/**
 * V1-FIX-006 — "Today's Highlights": specific, real, per-event facts in
 * place of the old generic "{N} active proposals"/"{N} whale transfers"
 * counts. Each category below is independently real-or-omitted (never
 * padded) and contributes AT MOST ONE highlight — "prefer breadth over
 * repetition" per the spec, satisfied structurally here since there is
 * exactly one slot per category, never two whale events or two governance
 * lines competing for attention.
 *
 * V1-FIX-006A — priority order now matches the spec's own list (TVL
 * movements → Whale → Governance → Security/Contract verification →
 * Developer activity), restricted, as before, to the categories this
 * codebase has a REAL signal for. Two tiers from that spec are deliberately
 * absent, per this pass's own architecture audit: "Major protocol events"
 * has no distinct data source anywhere in this codebase to honestly map to,
 * and "Security/Risk" as a tier separate from contract verification exists
 * only as a narrative classification inside the client-only Alert
 * Intelligence pipeline (`lib/alerts/service.ts`, `EcosystemRisksWidget`) —
 * architecturally unreachable from this Server Component (that module only
 * self-initializes `if (typeof window !== "undefined")`); folded into the
 * one real "security" tier below, same as V1-FIX-006 already documented.
 * "Market movement" (the spec's lowest-priority tier) is real and equally
 * zero-cost (CoinGecko's already-fetched bulk markets list) but left out of
 * this pass on purpose — the five tiers below already reliably produce
 * several real highlights, and market movement carries the most overlap
 * risk with AI Command Center's own Market Momentum category for the
 * least decision-relevant tier in the spec's own ordering.
 */
export function buildExecutiveHighlights(input: {
  topTvlMover: { projectId: string; projectName: string; changePct24h: number } | null;
  whaleEvents: WhaleEvent[];
  governanceEvents: GovernanceEvent[];
  verifiedContract: VerifiedContract | null;
  repoStats: RepoStats | null;
}): ExecutiveHighlight[] {
  return [
    buildTvlHighlight(input.topTvlMover),
    buildWhaleHighlight(input.whaleEvents),
    buildGovernanceHighlight(input.governanceEvents),
    buildContractVerificationHighlight(input.verifiedContract),
    buildDeveloperActivityHighlight(input.repoStats),
  ].filter((highlight): highlight is ExecutiveHighlight => highlight !== null);
}

/**
 * V1-FIX-006A — a compact "759 Projects · TVL $5.47B · 24h Volume $486M"
 * stat line, templated over whichever of `getKpis()`'s items are actually
 * available (never a fabricated clause for one that's currently mock/
 * unavailable), replacing the previous two-sentence prose paragraph. This
 * pass's own goal is visual priority — "what changed today," not "how many
 * projects exist" — so these ecosystem-scale stats become a compact,
 * secondary line (this file's own architecture audit found no way to make
 * them more informative without either a new provider or duplicating what
 * `buildExecutiveHighlights` already covers); real specifics now own the
 * widget's primary space instead. Sentiment is deliberately NOT folded in
 * here — `ExecutiveSummaryStrip.tsx` already renders it once, on its own
 * chip row; repeating it in this line would be exactly the kind of same-
 * fact duplication this pass's "avoid duplicate information" rule forbids.
 */
export function buildExecutiveSummary(kpis: Kpi[]): string {
  const clauses: string[] = [];

  const projects = findKpi(kpis, "projects");
  const tvl = findKpi(kpis, "tvl");
  const volume = findKpi(kpis, "volume24h");

  if (projects) clauses.push(`${formatCompactNumber(projects.value)} Projects`);
  if (tvl) clauses.push(`TVL ${formatCompactCurrency(tvl.value)}`);
  if (volume) clauses.push(`24h Volume ${formatCompactCurrency(volume.value)}`);

  return clauses.join(" · ");
}
