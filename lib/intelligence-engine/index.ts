import { RuleBasedIntelligenceProvider } from "@/lib/intelligence-engine/rule-based-provider";
import type { IntelligenceProvider } from "@/lib/intelligence-engine/types";

export { buildNarrativeSignals, buildProjectSummary, buildRiskAnalysis } from "@/lib/intelligence-engine/rule-based-provider";

const ruleBasedProvider = new RuleBasedIntelligenceProvider();

/**
 * Selects the active `IntelligenceProvider` via `INTELLIGENCE_PROVIDER`
 * (default `"rule-based"`). `"openai"`/`"claude"` are real, named cases —
 * not just a comment — so wiring in a future LLM-backed provider is a
 * one-class swap here, not a refactor of every caller. PR10 intentionally
 * ships no SDK/API-key dependency for either.
 */
export function getIntelligenceProvider(): IntelligenceProvider {
  const selected = process.env.INTELLIGENCE_PROVIDER ?? "rule-based";

  switch (selected) {
    case "rule-based":
      return ruleBasedProvider;
    case "openai":
      throw new Error(
        "INTELLIGENCE_PROVIDER=openai is not implemented in PR10 — see the PR10 plan's Intelligence Engine section. Falls back to rule-based by leaving INTELLIGENCE_PROVIDER unset."
      );
    case "claude":
      throw new Error(
        "INTELLIGENCE_PROVIDER=claude is not implemented in PR10 — see the PR10 plan's Intelligence Engine section. Falls back to rule-based by leaving INTELLIGENCE_PROVIDER unset."
      );
    default:
      return ruleBasedProvider;
  }
}

export type {
  BriefDeveloperActivityInput,
  BriefGovernanceInput,
  BriefInput,
  BriefOutput,
  BriefWhaleInput,
  IntelligenceProvider,
  NarrativeCategorySample,
  NarrativeInput,
  NarrativeOutput,
  NarrativeSignal,
  ProjectSummaryInput,
  ProjectSummaryOutput,
  RiskAnalysisInput,
  RiskAnalysisOutput,
  RiskLevel,
} from "@/lib/intelligence-engine/types";
