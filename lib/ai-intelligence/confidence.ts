import type { SupportingSignal } from "@/lib/ai-intelligence/evidence";

/**
 * How sure the engine is that a brief's claim is accurate — always
 * derived from the evidence actually attached to it, never assigned by
 * hand. See docs/AI_INTELLIGENCE_ENGINE.md "Confidence vs Impact" for the
 * distinction from `IntelligenceImpactLevel`, and docs/PRODUCT_BIBLE/
 * 05_INTELLIGENCE_FRAMEWORK.md's Confidence Framework for the full
 * 7-dimension model (Evidence Quality, Source Reliability, Freshness,
 * Coverage, Consensus, Conflicting Evidence, Unknowns) this PR's
 * `deriveConfidence()` deliberately only partially implements — see below.
 */
export const INTELLIGENCE_CONFIDENCE_LEVELS = ["low", "medium", "high", "very-high"] as const;
export type IntelligenceConfidenceLevel = (typeof INTELLIGENCE_CONFIDENCE_LEVELS)[number];

export type IntelligenceConfidence = {
  level: IntelligenceConfidenceLevel;
  /** Plain-language explanation of why this level was reached — always generated from the same inputs `deriveConfidence()` used, never hand-written separately (which could drift from the real evidence). */
  rationale: string;
  /** `evidence.length` at the moment confidence was derived — kept alongside `level` so a reader can sanity-check the label against a real count, not just trust the word. */
  evidenceCount: number;
};

/**
 * Real, deterministic confidence derivation from two of the Confidence
 * Framework's seven dimensions this PR's `SupportingSignal` shape can
 * actually measure today:
 *
 * - **Evidence quantity** — more independent observations support a
 *   stronger claim.
 * - **Consensus** (approximated as source diversity) — five signals that
 *   all come from the same single source corroborate each other far less
 *   than five signals spread across three different sources.
 *
 * The other five dimensions (Evidence Quality, Source Reliability,
 * Freshness, Coverage, Conflicting Evidence, Unknowns) need per-signal
 * metadata `SupportingSignal` does not carry yet (e.g. a reliability
 * score per source, a staleness window) — implementing them is
 * deliberately left as future work rather than faked with placeholder
 * numbers. This function's thresholds are a starting heuristic, not a
 * statistically validated model — same caveat as `lib/discovery/
 * duplicates.ts`'s match weights.
 *
 * Never called with an empty array — `createIntelligenceBrief()`
 * (`builder.ts`) refuses to construct a brief with zero evidence at all,
 * since "low confidence" and "no evidence" are not the same claim.
 */
export function deriveConfidence(evidence: SupportingSignal[]): IntelligenceConfidence {
  const evidenceCount = evidence.length;
  const distinctSources = new Set(evidence.map((item) => item.source)).size;

  let level: IntelligenceConfidenceLevel;
  if (evidenceCount >= 5 && distinctSources >= 3) level = "very-high";
  else if (evidenceCount >= 3 && distinctSources >= 2) level = "high";
  else if (evidenceCount >= 2) level = "medium";
  else level = "low";

  const rationale = `Derived from ${evidenceCount} supporting signal${evidenceCount === 1 ? "" : "s"} across ${distinctSources} distinct source${distinctSources === 1 ? "" : "s"}.`;

  return { level, rationale, evidenceCount };
}
