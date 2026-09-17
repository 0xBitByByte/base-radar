/**
 * V4-FUTURE-002E — reusable lookup infrastructure over `AutomationResult[]`,
 * the same "additive, read-only helper over an unchanged source array"
 * shape `lib/cross-feature/indexes.ts` already established. Built once per
 * `results` array version; the array itself stays the sole source of
 * truth — nothing here replaces it.
 *
 * `resultByTriggeredAt` fixes a genuine, currently-existing O(n×m) pattern:
 * `RecentWalletEventsSection` (`components/wallet/WalletAutomationSections.tsx`)
 * runs `results.find(r => r.triggeredAt === event.timestamp)` once PER
 * EVENT inside a render loop — this index makes that O(1) per event
 * instead of a fresh linear scan every time.
 */

import type { AutomationResult } from "@/lib/automation/types";

export type AutomationIndexes = {
  /** First-write-wins, matching `Array.prototype.find()`'s "first match" semantics exactly — see `lib/cross-feature/indexes.ts`'s own doc comment for why this matters. */
  resultByTriggeredAt: Map<string, AutomationResult>;
};

export function buildAutomationIndexes(results: AutomationResult[]): AutomationIndexes {
  const resultByTriggeredAt = new Map<string, AutomationResult>();
  for (const result of results) {
    if (!resultByTriggeredAt.has(result.triggeredAt)) resultByTriggeredAt.set(result.triggeredAt, result);
  }
  return { resultByTriggeredAt };
}
