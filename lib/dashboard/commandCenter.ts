/**
 * V1-FIX-002 / V1-FIX-002A / V1-FIX-002B / V1-FIX-002C — pure derivations
 * for the AI Command Center's body. Same discipline as
 * `lib/dashboard/executiveSummary.ts`: every function here reads real,
 * already-computed fields off `IntelligenceAlert`/`Alert` (both built
 * entirely from real provider data, see
 * `lib/alerts/intelligence/types.ts`'s own doc comment) — nothing here
 * calls a provider, generates text via an LLM, or invents a number. No new
 * data source: `TodaysTopInsight.tsx` already read `IntelligenceAlert[]` via
 * `useEcosystemIntelligenceAlerts()`; this only adds the raw `Alert[]`
 * (`useAlerts()`, which already existed for the Alerts page) so a signal's
 * generic `label` ("TVL change") can be traced back to the specific real
 * event that produced it ("TVL Increased 4.2%", `Alert.title`).
 *
 * V1-FIX-002A replaced "top N by raw score" with one-recommendation-per-
 * category (`buildCommandCenterInsights`/`buildWhyBullets`, both removed).
 *
 * V1-FIX-002B replaced that hard per-category cap with `buildRecommendations()`
 * below: diversity is a RANKING PREFERENCE (a per-repeat score penalty), not
 * a hard rule. Also added: multiple direction-consistent supporting
 * reasons (was a single optional line), and a category-driven CTA (was
 * always "Research Project").
 *
 * V1-FIX-002C, final V1 polish — two refinements, no architecture change:
 * `category` (the internal `AlertCategory`, e.g. `"security"`) is untouched
 * and still drives the CTA/ranking exactly as before, but the user-facing
 * `categoryLabel` can now differ from the internal category name when the
 * generic label would misrepresent the specific real event (see
 * `resolveDisplayLabel`). Supporting-reason selection is no longer purely
 * weight-ranked — it now prefers a fixed set of higher-value categories
 * (`SUPPORTING_REASON_PRIORITY`) and shows at most one per category, so two
 * similar governance lines never both appear.
 */

import type { Alert, AlertCategory } from "@/lib/alerts/types";
import type { IntelligenceAlert, IntelligenceSignal } from "@/lib/alerts/intelligence/types";

export type InsightDirection = "up" | "warning";

/**
 * The seven decision-value dimensions this feature tracks. `"liquidity"` is
 * a real `AlertCategory` (`lib/alerts/types.ts`) but no provider or scorer
 * in this codebase currently produces a `liquidity` signal (confirmed:
 * `scoring.ts`'s `SIGNAL_SCORERS` has no liquidity scorer, and grepping
 * every provider file for `category: "liquidity"` returns nothing) — kept
 * here for when that changes, but no candidate will ever exist for it
 * today, so it will never appear in a real result.
 */
const RECOMMENDATION_CATEGORY_LABEL: Partial<Record<AlertCategory, string>> = {
  tvl: "TVL",
  whale: "Whale Activity",
  governance: "Governance",
  security: "Security",
  liquidity: "Liquidity",
  release: "Developer Activity",
  price: "Market Momentum",
};

/**
 * V1-FIX-002C, Requirement 2 — presentation-only label override, keyed by
 * (category, real `Alert.source`). The internal `category` a signal is
 * scored under (`scoring.ts`) is never changed by this — `security` stays
 * `security` for CTA/ranking purposes — only what the user reads changes.
 * Today's one real, confusing case (confirmed live in V1-FIX-002B):
 * `github.ts`'s `buildArchivedAlert()` deliberately scores an archived
 * GitHub repo under `category: "security"` (a real trust concern), but
 * showing the bare category name "Security" next to "Repository Archived"
 * reads as a contract/on-chain security event, not a maintenance signal —
 * "Repository Health" says what actually happened. `security` alerts from
 * Blockscout (e.g. "Contract Verified") keep the plain "Security" label —
 * that pairing already reads correctly, so it's left alone rather than
 * changed for its own sake.
 */
const DISPLAY_LABEL_OVERRIDE: Partial<Record<AlertCategory, Partial<Record<string, string>>>> = {
  security: { GitHub: "Repository Health" },
};

function resolveDisplayLabel(category: AlertCategory, sourceAlert: Alert): string {
  return DISPLAY_LABEL_OVERRIDE[category]?.[sourceAlert.source] ?? RECOMMENDATION_CATEGORY_LABEL[category] ?? category;
}

/**
 * V1-FIX-002B, Requirement 4 — context-aware CTA. Every path here is a
 * REAL, already-shipped route under a project's profile (confirmed by
 * reading `app/dashboard/projects/[slug]/*`: `governance`, `contracts`,
 * `pools`, `whale` all exist) — never a placeholder or invented path.
 * `release`/`price`/`liquidity` have no dedicated sub-route today, so they
 * (and any future category added here without an entry) fall back to the
 * general profile page with "Research Project", exactly the spec's
 * "General → Research Project" case.
 */
const RECOMMENDATION_CTA: Partial<Record<AlertCategory, { label: string; path: string }>> = {
  governance: { label: "View Proposal", path: "governance" },
  security: { label: "Review Risk", path: "contracts" },
  tvl: { label: "Analyze TVL", path: "pools" },
  whale: { label: "View Activity", path: "whale" },
};
const DEFAULT_CTA = { label: "Research Project", path: null as string | null };

export type Recommendation = {
  projectId: string;
  projectName: string;
  /** Internal `AlertCategory` — unchanged, still what `RECOMMENDATION_CTA`/ranking key off. */
  category: AlertCategory;
  /** User-facing label — usually `RECOMMENDATION_CATEGORY_LABEL[category]`, but see `resolveDisplayLabel` for the one real exception. */
  categoryLabel: string;
  direction: InsightDirection;
  /** The real `Alert.title` behind this recommendation's winning signal (e.g. "TVL Increased 4.2%") — the reason this project/category pair was selected. */
  primaryReason: string;
  /** 0-2 real `Alert.title`s from OTHER signals on the same project, ranked by `SUPPORTING_REASON_PRIORITY` — never fabricated, never a repeat of `primaryReason`, never two from the same category. */
  supportingReasons: string[];
  confidence: number;
  ctaLabel: string;
  /** Sub-route segment under `/dashboard/projects/{slug}/…`, or `null` for the base profile page. */
  ctaPath: string | null;
};

type Candidate = { intelligenceAlert: IntelligenceAlert; category: AlertCategory; signal: IntelligenceSignal };

/** Every real (project, category) candidate — at most one per project per category, since each real `Alert` (and therefore each `IntelligenceSignal`) has exactly one category, and every provider in this codebase generates at most one alert per project per category (e.g. `defillama.ts`'s `buildTvlAlert` returns at most one `Alert` per project). */
function collectCandidates(alerts: IntelligenceAlert[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const intelligenceAlert of alerts) {
    for (const signal of intelligenceAlert.signals) {
      if (!(signal.category in RECOMMENDATION_CATEGORY_LABEL)) continue;
      candidates.push({ intelligenceAlert, category: signal.category, signal });
    }
  }
  return candidates;
}

/**
 * V1-FIX-002B, Requirement 2 (kept unchanged by V1-FIX-002C, Requirement 4
 * — "keep the diversity algorithm") — diversity as a ranking PREFERENCE,
 * not a hard cap. Greedy selection: at each step, pick whichever remaining
 * real candidate has the highest EFFECTIVE score — its real signal `weight`
 * (`scoring.ts`'s own severity-scaled magnitude, never invented here) minus
 * `DIVERSITY_PENALTY` for every recommendation this category has already
 * won. A strong second (or third) candidate in an already-used category can
 * still win a slot over a weak candidate in an unused category.
 *
 * `DIVERSITY_PENALTY = 6` — roughly half of `scoring.ts`'s smallest real
 * base weight (Market Momentum's `8`) before severity scaling, chosen so a
 * same-category repeat needs a real, meaningfully-larger weight to win over
 * a fresh category, while a genuinely dominant repeat still can.
 *
 * A project already selected for one slot is excluded from every later
 * pick — no project is ever recommended twice (a hard rule; showing the
 * same project under two cards is redundant, not diversity).
 */
const DIVERSITY_PENALTY = 6;

function selectCandidates(candidates: Candidate[], limit: number): Candidate[] {
  const remaining = candidates.slice();
  const selected: Candidate[] = [];
  const usedProjectIds = new Set<string>();
  const categoryCounts = new Map<AlertCategory, number>();

  while (selected.length < limit) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      if (usedProjectIds.has(candidate.intelligenceAlert.projectId)) continue;
      const penalty = (categoryCounts.get(candidate.category) ?? 0) * DIVERSITY_PENALTY;
      const effectiveScore = candidate.signal.weight - penalty;
      if (effectiveScore > bestScore) {
        bestScore = effectiveScore;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;

    const picked = remaining[bestIndex];
    selected.push(picked);
    usedProjectIds.add(picked.intelligenceAlert.projectId);
    categoryCounts.set(picked.category, (categoryCounts.get(picked.category) ?? 0) + 1);
  }

  return selected;
}

const MAX_SUPPORTING_REASONS = 2;

/**
 * V1-FIX-002C, Requirement 3 — "rank supporting reasons by usefulness,"
 * naming whale/TVL-growth/governance/market-momentum as preferred. Applied
 * as a category priority order a supporting candidate is sorted by BEFORE
 * its raw weight (rather than weight alone, V1-FIX-002B's behavior) — a
 * lower-weight whale signal can now out-rank a higher-weight but less
 * decision-relevant one. `release`/`security`/`liquidity` are real but
 * lower-priority supporting context, so they sort last rather than being
 * excluded. Ties within the same priority tier still break by real weight.
 */
const SUPPORTING_REASON_PRIORITY: Partial<Record<AlertCategory, number>> = {
  whale: 0,
  tvl: 1,
  governance: 2,
  price: 3,
  release: 4,
  security: 5,
  liquidity: 6,
};

/**
 * Up to `MAX_SUPPORTING_REASONS` real `Alert.title`s from the same
 * project's OTHER signals — direction-consistent with `direction` (a
 * "warning" card may cite other real negative or neutral signals, an "up"
 * card excludes negative ones, so a supporting line never contradicts the
 * card's own framing), ranked by `SUPPORTING_REASON_PRIORITY` then real
 * weight, and capped at ONE PER CATEGORY — live-verified in V1-FIX-002B
 * that a project can have several distinct real governance alerts
 * ("Proposal Passed" for one proposal, "Proposal Created" for another);
 * showing two similar governance lines side by side added noise, not a
 * second useful fact. Also deduped by title text against the primary
 * reason. Quality over quantity: a project with only one genuinely useful
 * signal shows only one line, never padded to fill the cap.
 */
function buildSupportingReasons(
  intelligenceAlert: IntelligenceAlert,
  primarySourceAlertId: string,
  primaryReason: string,
  direction: InsightDirection,
  alertById: Map<string, Alert>
): string[] {
  const isConsistent = (signalDirection: -1 | 0 | 1) => (direction === "up" ? signalDirection !== -1 : signalDirection !== 1);

  const ranked = intelligenceAlert.signals
    .filter((signal) => signal.sourceAlertId !== primarySourceAlertId && isConsistent(signal.direction))
    .sort((a, b) => (SUPPORTING_REASON_PRIORITY[a.category] ?? 99) - (SUPPORTING_REASON_PRIORITY[b.category] ?? 99) || b.weight - a.weight);

  const usedCategories = new Set<AlertCategory>();
  const reasons: string[] = [];
  for (const signal of ranked) {
    if (usedCategories.has(signal.category)) continue;
    const alert = alertById.get(signal.sourceAlertId);
    if (!alert || alert.title === primaryReason) continue;
    usedCategories.add(signal.category);
    reasons.push(alert.title);
    if (reasons.length >= MAX_SUPPORTING_REASONS) break;
  }

  return reasons;
}

/**
 * The full pipeline: collect every real (project, category) candidate,
 * rank by diversity-preferring greedy selection (`selectCandidates`), then
 * build each selected candidate's full `Recommendation` (primary reason,
 * up to `MAX_SUPPORTING_REASONS` ranked supporting reasons, real
 * category-driven CTA, presentation-aware label). A category with no real
 * candidate at all simply never appears in `collectCandidates`'s output —
 * never padded.
 */
export function buildRecommendations(alerts: IntelligenceAlert[], rawAlerts: Alert[], limit: number): Recommendation[] {
  const alertById = new Map(rawAlerts.map((alert) => [alert.id, alert]));
  const candidates = collectCandidates(alerts);
  const selected = selectCandidates(candidates, limit);

  const recommendations: Recommendation[] = [];
  for (const { intelligenceAlert, category, signal } of selected) {
    const primaryAlert = alertById.get(signal.sourceAlertId);
    if (!primaryAlert) continue;

    const direction: InsightDirection = signal.direction === -1 ? "warning" : "up";
    const supportingReasons = buildSupportingReasons(intelligenceAlert, signal.sourceAlertId, primaryAlert.title, direction, alertById);
    const cta = RECOMMENDATION_CTA[category] ?? DEFAULT_CTA;

    recommendations.push({
      projectId: intelligenceAlert.projectId,
      projectName: intelligenceAlert.projectName,
      category,
      categoryLabel: resolveDisplayLabel(category, primaryAlert),
      direction,
      primaryReason: primaryAlert.title,
      supportingReasons,
      confidence: intelligenceAlert.confidence,
      ctaLabel: cta.label,
      ctaPath: cta.path,
    });
  }

  return recommendations;
}
