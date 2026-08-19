/** Pure helpers for the Whale Intelligence section. No JSX, no I/O. */

import type { WhaleEvent } from "@/lib/whale";

const RECENT_LIMIT = 5;

/** Newest first by `timestamp` — same convention `governanceIntelligenceHelpers.ts`'s "Recent" category already uses. */
function byTimestampDesc(events: WhaleEvent[]): WhaleEvent[] {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// Whale Intelligence Curation Engine (PR-084.05)
//
// Mirrors the Pool/Contract/Governance Curation Engines' exact shape and
// role. Every category here reflects a real field already on `WhaleEvent`
// (`lib/whale/types.ts`) — `classification` (the existing, real, confidence-
// gated two-tier label from `lib/whale/blockscout-provider.ts`) or
// `toIsContract` (a real Blockscout fact about the recipient address type).
// No direction/buy-sell/CEX/smart-money category exists — PR-084.05's
// research live-verified none of that is real, available data.
// ---------------------------------------------------------------------------

export type WhaleCategoryId = "whale-alert" | "large-transfer" | "to-contract" | "to-wallet" | "recent" | "archived" | "all";

export type WhaleCategoryDefinition = {
  id: WhaleCategoryId;
  emoji: string;
  label: string;
  /** The one sentence rendered as this category's "why is this transfer here" tooltip. */
  description: string;
  apply: (events: WhaleEvent[]) => WhaleEvent[];
};

export const WHALE_CATEGORIES: WhaleCategoryDefinition[] = [
  {
    id: "whale-alert",
    emoji: "🐋",
    label: "Whale Alert",
    description: "Base Radar Intelligence: a large transfer whose confidence score (magnitude over threshold, plus any corroborating signal) crosses the Whale Alert bar.",
    apply: (events) => events.filter((event) => event.classification === "whale-alert"),
  },
  {
    id: "large-transfer",
    emoji: "🔷",
    label: "Large Transfer",
    description: "Base Radar Intelligence: a transfer over the $100,000 threshold that didn't cross the higher-confidence Whale Alert bar.",
    apply: (events) => events.filter((event) => event.classification === "large-on-chain-transfer"),
  },
  {
    id: "to-contract",
    emoji: "📥",
    label: "Sent to Contract",
    description: "The recipient address is a contract, per Blockscout's own classification — not a buy/sell or exchange claim.",
    apply: (events) => events.filter((event) => event.toIsContract),
  },
  {
    id: "to-wallet",
    emoji: "👤",
    label: "Sent to Wallet",
    description: "The recipient address is not a contract, per Blockscout's own classification.",
    apply: (events) => events.filter((event) => !event.toIsContract),
  },
  {
    id: "recent",
    emoji: "🕐",
    label: "Recent",
    description: "The 5 most recently detected transfers.",
    apply: (events) => byTimestampDesc(events).slice(0, RECENT_LIMIT),
  },
  {
    id: "archived",
    emoji: "🗄️",
    label: "Archived",
    description: "Detected transfers older than the 5 most recent.",
    apply: (events) => byTimestampDesc(events).slice(RECENT_LIMIT),
  },
  {
    id: "all",
    emoji: "📋",
    label: "All Transfers",
    description: "Every large transfer Base Radar has detected for this project.",
    apply: (events) => events,
  },
];

const WHALE_CATEGORY_BY_ID = new Map(WHALE_CATEGORIES.map((category) => [category.id, category]));

export function getWhaleEventsForCategory(events: WhaleEvent[], categoryId: WhaleCategoryId): WhaleEvent[] {
  return (WHALE_CATEGORY_BY_ID.get(categoryId) ?? WHALE_CATEGORY_BY_ID.get("all"))!.apply(events);
}
