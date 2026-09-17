/**
 * V4-INTELLIGENCE-003 — AI Timeline: a relabeling of Wallet Automation's
 * already-real event log (`lib/wallet-automation`'s `WalletEvent[]`,
 * `useWalletAutomation()`'s own `events`), NOT a new computation.
 *
 * This is a deliberate architectural boundary, not an oversight: a single
 * `PortfolioIntelligence` snapshot has no history of its own — it's one
 * point in time, produced fresh from whatever holdings exist right now.
 * Only Wallet Automation's before/after diffing (`events.ts`'s
 * `buildPortfolioContentEvents`/`buildLifecycleEvents`) genuinely knows
 * "this changed since last time." Building a timeline any other way here
 * would mean either re-implementing that diffing a second time (forbidden —
 * "never duplicate calculations") or fabricating temporal claims the AI
 * layer has no way to honestly back. So this file takes the real event log
 * as its only input and only reshapes it.
 */

import type { AITimelineEntry } from "@/lib/portfolio-ai/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";

const MAX_TIMELINE_ENTRIES = 10;

export function buildAITimeline(events: WalletEvent[]): AITimelineEntry[] {
  return events.slice(0, MAX_TIMELINE_ENTRIES).map((event) => ({
    id: event.id,
    headline: event.title,
    tone: event.tone,
    timestamp: event.timestamp,
  }));
}
