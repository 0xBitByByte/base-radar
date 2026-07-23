import type { IntelligenceSourceType } from "@/lib/ai-intelligence/sources";

/**
 * The finite set of real, observable event kinds an `AIIntelligenceBrief`
 * can cite as evidence — matching the brief's own example list exactly.
 * `"other"` exists for a genuinely real signal that doesn't fit the other
 * six, never as a dumping ground for something unverified (an unverified
 * claim isn't evidence at all — it doesn't get a `SupportingSignal`).
 */
export const EVIDENCE_KINDS = [
  "registry-change",
  "intelligence-signal",
  "provider-update",
  "contract-event",
  "liquidity-movement",
  "governance-event",
  "other",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * One real, observed piece of evidence supporting a brief — never a
 * restatement of the brief's own claim. `occurredAt` is the evidence's own
 * timestamp (when the registry changed, when the signal fired), which may
 * predate `AIIntelligenceBrief.generatedAt` by any amount — evidence is
 * not required to be fresh, only real.
 */
export type SupportingSignal = {
  id: string;
  kind: EvidenceKind;
  /** Plain description of what was actually observed, e.g. "TVL rose 18% over 24h per DefiLlama" — never a paraphrase of the brief's headline. */
  description: string;
  source: IntelligenceSourceType;
  occurredAt: string;
  referenceUrl?: string;
};
