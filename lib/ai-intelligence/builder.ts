import { deriveConfidence } from "@/lib/ai-intelligence/confidence";
import type { IntelligenceCategory } from "@/lib/ai-intelligence/categories";
import type { SupportingSignal } from "@/lib/ai-intelligence/evidence";
import type { IntelligenceImpactLevel } from "@/lib/ai-intelligence/impact";
import type { SourceReference } from "@/lib/ai-intelligence/sources";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";

export type CreateIntelligenceBriefInput = {
  /** Deterministic id override — defaults to `brief:${generatedAt}`. Pass one explicitly if a caller might construct two briefs in the same millisecond. */
  id?: string;
  generatedAt?: string;
  headline: string;
  summary: string;
  impact: IntelligenceImpactLevel;
  category: IntelligenceCategory;
  affectedProjects?: string[];
  supportingSignals: SupportingSignal[];
  supportingSources: SourceReference[];
  tags?: string[];
};

/**
 * The one place an `AIIntelligenceBrief` gets constructed — enforces this
 * PR's non-negotiable rules in code, not just documentation:
 *
 * - **No insight without evidence.** Zero `supportingSignals` throws,
 *   rather than silently producing a `confidence: "low"` brief — "low
 *   confidence" and "no evidence at all" are different claims, and this
 *   PR never conflates them.
 * - **No unattributed intelligence.** Zero `supportingSources` throws for
 *   the same reason.
 * - **Confidence is never hand-set.** It isn't even an input field here —
 *   `deriveConfidence()` is the only way one gets produced.
 *
 * This function does not call any LLM, generate any text, or invent any
 * field — `headline`/`summary`/`impact`/`category` are supplied by
 * whatever future generation step calls this (the Rule-Based Intelligence
 * Provider, a future AI provider, or a human-authored brief). See
 * docs/AI_INTELLIGENCE_ENGINE.md "Future AI Generation Flow."
 */
export function createIntelligenceBrief(input: CreateIntelligenceBriefInput): AIIntelligenceBrief {
  if (input.supportingSignals.length === 0) {
    throw new Error(
      "AIIntelligenceBrief requires at least one supporting signal — confidence can never be derived from zero evidence."
    );
  }
  if (input.supportingSources.length === 0) {
    throw new Error("AIIntelligenceBrief requires at least one supporting source for attribution.");
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return {
    id: input.id ?? `brief:${generatedAt}`,
    generatedAt,
    headline: input.headline,
    summary: input.summary,
    confidence: deriveConfidence(input.supportingSignals),
    impact: input.impact,
    category: input.category,
    affectedProjects: input.affectedProjects ?? [],
    supportingSignals: input.supportingSignals,
    supportingSources: input.supportingSources,
    tags: input.tags ?? [],
  };
}
