/** Pure helpers for the Governance Intelligence section. No JSX, no I/O. */

import type { GovernanceEvent } from "@/lib/governance";

const CLOSED_STATUSES = new Set<GovernanceEvent["status"]>(["passed", "failed"]);

function isClosed(event: GovernanceEvent): boolean {
  return CLOSED_STATUSES.has(event.status);
}

/**
 * PR-084.04 — Base Radar's own read, not a Snapshot fact: Snapshot's `quorum`
 * is genuinely `0` (unset) for several real spaces this registry tracks,
 * which makes the pre-existing `status` heuristic (`mapStatus()` in
 * `lib/providers/snapshot/mapper.ts`, unchanged by this PR) label every
 * closed proposal from those spaces "passed" regardless of the real outcome.
 * This flag surfaces that uncertainty explicitly rather than hiding it or
 * silently trusting the label — the same category of move as Contract
 * Intelligence's "Attention Required".
 */
export function isOutcomeUncertain(event: GovernanceEvent): boolean {
  return isClosed(event) && event.quorumMet === null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * The project's own median `voterCount` across its closed proposals with a
 * real count — a relative, self-referential threshold (same technique as
 * the Pool Curation Engine's Trending category) so High/Low Participation
 * means something for both a project with dozens of voters and one with a
 * handful, rather than one hardcoded number that wouldn't generalize.
 */
function closedVoterCountMedian(events: GovernanceEvent[]): number | null {
  const counts = events.filter(isClosed).flatMap((event) => (event.voterCount !== null ? [event.voterCount] : []));
  return median(counts);
}

/** Closed proposals, newest first by `end` — the same ordering `GovernanceList.tsx`'s existing "Recent" band already uses. */
function closedByEndDesc(events: GovernanceEvent[]): GovernanceEvent[] {
  return events.filter(isClosed).sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
}

const RECENT_LIMIT = 5;

/**
 * Same text-cleaning `GovernanceList.tsx`'s `ProposalRow` already applies to
 * `event.description` (Snapshot's raw markdown `body`, sometimes carrying a
 * leading YAML frontmatter block Snapshot's own UI never renders). Kept as
 * an independent copy here rather than importing from `GovernanceList.tsx`
 * — this PR's own brief scopes the existing Governance section to exactly
 * one change (its new "View All Governance" link), the same precedent
 * `ContractCard.tsx` set by not refactoring `ContractsList.tsx`.
 */
export function cleanProposalDescription(description: string): string {
  let text = description;
  text = text.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\s*/, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^>\s?/gm, "");
  text = text.replace(/^[-*+]\s+/gm, "");
  return text.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Governance Curation Engine (PR-084.04)
//
// Mirrors the Pool/Contract Curation Engines' exact shape and role — one
// config-driven category list, one dispatcher. "Executed"/"Pending
// Execution" are deliberately not included: a live GraphQL introspection
// against Snapshot's real API (PR-084.04 research) confirmed no execution-
// status field exists anywhere on its schema, matching
// `docs/PROVIDER_DATA_COVERAGE_AUDIT.md` and `lib/alerts/providers/snapshot.ts`'s
// own prior conclusion. Omitted entirely rather than stubbed.
// ---------------------------------------------------------------------------

export type GovernanceCategoryId =
  | "active"
  | "upcoming"
  | "passed"
  | "failed"
  | "outcome-uncertain"
  | "high-participation"
  | "low-participation"
  | "recent"
  | "archived"
  | "all";

export type GovernanceCategoryDefinition = {
  id: GovernanceCategoryId;
  emoji: string;
  label: string;
  /** The one sentence rendered as this category's "why is this proposal here" tooltip. */
  description: string;
  apply: (events: GovernanceEvent[]) => GovernanceEvent[];
};

export const GOVERNANCE_CATEGORIES: GovernanceCategoryDefinition[] = [
  {
    id: "active",
    emoji: "🗳️",
    label: "Active",
    description: "Proposals currently open for voting on Snapshot.",
    apply: (events) => events.filter((event) => event.status === "active"),
  },
  {
    id: "upcoming",
    emoji: "⏳",
    label: "Upcoming",
    description: "Proposals scheduled to open for voting soon.",
    apply: (events) => events.filter((event) => event.status === "pending"),
  },
  {
    id: "passed",
    emoji: "✅",
    label: "Passed",
    description: "Closed proposals Snapshot's own data shows met quorum with a net-positive score.",
    apply: (events) => events.filter((event) => event.status === "passed"),
  },
  {
    id: "failed",
    emoji: "❌",
    label: "Failed",
    description: "Closed proposals Snapshot's own data shows did not meet quorum or scored net-negative.",
    apply: (events) => events.filter((event) => event.status === "failed"),
  },
  {
    id: "outcome-uncertain",
    emoji: "⚠️",
    label: "Outcome Uncertain",
    description: "Base Radar Intelligence: this space set no quorum threshold, so the Passed/Failed label above is unverified — read the real vote scores before trusting it.",
    apply: (events) => events.filter(isOutcomeUncertain),
  },
  {
    id: "high-participation",
    emoji: "📈",
    label: "High Participation",
    description: "Base Radar Intelligence: closed proposals with voter turnout at or above this project's own median.",
    apply: (events) => {
      const threshold = closedVoterCountMedian(events);
      if (threshold === null) return [];
      return events.filter((event) => isClosed(event) && event.voterCount !== null && event.voterCount >= threshold);
    },
  },
  {
    id: "low-participation",
    emoji: "📉",
    label: "Low Participation",
    description: "Base Radar Intelligence: closed proposals with voter turnout below this project's own median.",
    apply: (events) => {
      const threshold = closedVoterCountMedian(events);
      if (threshold === null) return [];
      return events.filter((event) => isClosed(event) && event.voterCount !== null && event.voterCount < threshold);
    },
  },
  {
    id: "recent",
    emoji: "🕐",
    label: "Recent",
    description: "The 5 most recently closed proposals — the same definition already used in the Governance section above.",
    apply: (events) => closedByEndDesc(events).slice(0, RECENT_LIMIT),
  },
  {
    id: "archived",
    emoji: "🗄️",
    label: "Archived",
    description: "Closed proposals older than the 5 most recent.",
    apply: (events) => closedByEndDesc(events).slice(RECENT_LIMIT),
  },
  {
    id: "all",
    emoji: "📋",
    label: "All Proposals",
    description: "Every proposal Base Radar has fetched from this project's Snapshot space.",
    apply: (events) => events,
  },
];

const GOVERNANCE_CATEGORY_BY_ID = new Map(GOVERNANCE_CATEGORIES.map((category) => [category.id, category]));

export function getGovernanceForCategory(events: GovernanceEvent[], categoryId: GovernanceCategoryId): GovernanceEvent[] {
  return (GOVERNANCE_CATEGORY_BY_ID.get(categoryId) ?? GOVERNANCE_CATEGORY_BY_ID.get("all"))!.apply(events);
}
