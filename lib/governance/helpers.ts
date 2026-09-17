/** Small, generic, pure derivations shared across governance consumers in both the `lib/` and `components/` layers. No I/O. */

import type { GovernanceEvent } from "@/lib/governance/types";

/**
 * PR-085.01 — consolidated from two independently-written, byte-identical
 * copies of this exact filter found during the Executive Dashboard audit
 * (`lib/intelligence/scorecard.ts`'s Governance tile, `ProfileKeySignals.tsx`'s
 * Governance Activity glance tile). `null` in, `null` out — mirrors the
 * "no real governance source configured" case both callers already had to
 * handle themselves before this consolidation.
 */
export function countActiveProposals(governance: GovernanceEvent[] | null): number | null {
  return governance?.filter((event) => event.status === "active").length ?? null;
}
