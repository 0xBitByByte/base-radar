/**
 * PR-091.03/PR-091.05 (Intelligence Compare, Contract Compare) — the shape
 * `/api/projects/[slug]/compare-detail` returns and `useCompareProjectDetail`
 * consumes. Every field here is read straight off the SAME
 * `buildProjectIntelligence`/`buildIntelligenceReport`/`blockscout.getContractDetail`
 * calls `app/dashboard/projects/[slug]/page.tsx` already makes for a single
 * project's own AI/Contracts surfaces — this file adds no new scoring, no
 * new provider call shape, and no second intelligence engine. It exists
 * only because the Compare list is client-only local-device state (see
 * `lib/compare/storage.ts`), so the Compare page's Server Component can't
 * know in advance which up-to-4 projects to build this heavier, per-project
 * report for — the client fetches it, one project at a time, once a
 * project is actually selected.
 */

import type { Chain } from "@/data/projects/enums";

export type CompareContractDetail = {
  address: string;
  chain: Chain;
  /** `false` when Blockscout itself couldn't be reached/resolve anything for this address — every field below is `null` in that case, never guessed. */
  ok: boolean;
  verified: boolean | null;
  isContract: boolean | null;
  proxyType: string | null;
  compilerVersion: string | null;
  licenseType: string | null;
};

export type CompareProjectDetail = {
  /** Same non-advice, research-workflow phrasing every other surface uses (`RECOMMENDATION_FOR_RISK`) — never a new opinion. */
  recommendation: string;
  /** `IntelligenceReport.strengths` — real, evidence-backed, capped at 6. */
  strengths: string[];
  /** `IntelligenceReport.weaknesses` — real, evidence-backed, capped at 6. */
  weaknesses: string[];
  /** `IntelligenceReport.opportunities` — real, evidence-backed. */
  opportunities: string[];
  /** `IntelligenceReport.threats` — real, evidence-backed, capped at 6 (the same field the Profile AI page's "Bear Case" panel labels "Risks"). */
  threats: string[];
  /** Every real, registered contract address this project's registry entry carries — empty when it has none, never a fabricated placeholder row. */
  contracts: CompareContractDetail[];
};
