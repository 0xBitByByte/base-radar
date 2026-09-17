/**
 * V4-AUTOMATION-001 (Phase 5) — the one place `WalletEventMetadata` is
 * assembled, shared by `events.ts` (smart `WalletEvent`s) and `engine.ts`
 * (smart `AutomationResult`s) so neither re-derives it independently.
 * Every field is a direct read of `current`'s own already-computed data,
 * plus `buildAIActions(current)[0]?.estimatedImpact` — the one place this
 * reuses `lib/portfolio-ai`, per this phase's "reuse AI actions" instruction,
 * rather than re-deriving an impact rating from `PortfolioRecommendation.
 * priority` a second time.
 */

import { buildAIActions } from "@/lib/portfolio-ai/actions";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletEventMetadata } from "@/lib/wallet-automation/types";

export type SmartMetadataFocus = "top-contributor" | "top-warning" | "largest-protocol" | "general";

export function buildSmartMetadata(current: PortfolioIntelligence, focus: SmartMetadataFocus): WalletEventMetadata {
  const topNegativeContributor = current.negativeContributors[0] ?? null;
  const topWarning = current.warnings[0] ?? null;
  const topAction = buildAIActions(current)[0] ?? null;

  const relatedAssets = (focus === "top-contributor" || focus === "top-warning") && current.largestHolding ? [current.largestHolding.symbol] : [];
  const relatedProtocols = focus === "largest-protocol" && current.largestProtocol ? [current.largestProtocol.name] : [];

  return {
    severity: topWarning?.severity ?? null,
    confidence: current.confidenceScore,
    reason: topNegativeContributor?.reason ?? topWarning?.description ?? null,
    relatedAssets,
    relatedProtocols,
    estimatedImpact: topAction?.estimatedImpact ?? "low",
  };
}
