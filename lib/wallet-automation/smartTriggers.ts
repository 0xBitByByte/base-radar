/**
 * V4-AUTOMATION-001 (Phase 3) — 9 new edge-triggered predicates, mirroring
 * `triggers.ts`'s exact shape and discipline: pure functions of two
 * `PortfolioIntelligence` snapshots, `previous === null` never fires
 * (nothing to have transitioned FROM yet), a refresh that leaves a
 * condition unchanged produces nothing.
 *
 * Every field compared here (`confidenceScore`, `fingerprint`,
 * `recommendations[0]`, `riskScore`, `largestProtocol`,
 * `negativeContributors[0]`, `warnings[0]`) already lives on
 * `PortfolioIntelligence` itself — `PortfolioAI` doesn't introduce any new
 * underlying data beyond what this file already reads, so these triggers
 * have no dependency on `lib/portfolio-ai` at all. `lib/portfolio-ai` is
 * used instead where it adds real value: composing the NOTIFICATION COPY
 * these triggers' matches produce (see `summary.ts`), not detecting
 * whether they fired.
 */

import { SCORE_CHANGE_THRESHOLD } from "@/lib/wallet-automation/triggers";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

export function confidenceIncreased(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return current.confidenceScore - previous.confidenceScore >= SCORE_CHANGE_THRESHOLD;
}

export function confidenceDropped(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.confidenceScore - current.confidenceScore >= SCORE_CHANGE_THRESHOLD;
}

export function fingerprintChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.fingerprint !== current.fingerprint;
}

export function primaryRecommendationChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return (previous.recommendations[0]?.id ?? null) !== (current.recommendations[0]?.id ?? null);
}

export function riskScoreIncreased(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return current.riskScore - previous.riskScore >= SCORE_CHANGE_THRESHOLD;
}

export function riskScoreDecreased(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.riskScore - current.riskScore >= SCORE_CHANGE_THRESHOLD;
}

function protocolKey(protocol: PortfolioIntelligence["largestProtocol"]): string | null {
  return protocol ? `${protocol.symbol}:${protocol.address ?? "native"}` : null;
}

export function largestProtocolChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return protocolKey(previous.largestProtocol) !== protocolKey(current.largestProtocol);
}

export function topContributorChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return (previous.negativeContributors[0]?.id ?? null) !== (current.negativeContributors[0]?.id ?? null);
}

export function topWarningChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return (previous.warnings[0]?.id ?? null) !== (current.warnings[0]?.id ?? null);
}
