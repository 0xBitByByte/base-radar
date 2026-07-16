/**
 * Merges a project's already-fetched, heterogeneous "things that happened"
 * (a GitHub release, governance proposals, whale transfers, live signals)
 * into one chronological list — PR11 Part 9. Pure function, no I/O: every
 * input here is already-fetched data the caller (the Project Profile route)
 * assembled from the exact same functions Explorer/Dashboard already use
 * (`getProjectIntelligence`, `getRawWhaleEvents`, `getSignals`) — this file
 * only merges and sorts, it never talks to a provider.
 */

import type { GithubIntel, Risk, Tvl } from "@/lib/intelligence/types";
import type { GovernanceEvent } from "@/lib/governance/types";
import type { WhaleEvent } from "@/lib/whale/types";
import type { Signal } from "@/lib/data/types";
import type { TokenTransfer } from "@/lib/providers/blockscout/service";

export type TimelineEventKind =
  | "release"
  | "whale"
  | "governance"
  | "signal"
  | "commit-activity"
  | "tvl-change"
  | "risk-alert"
  | "transfer";

export type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  title: string;
  detail: string | null;
  timestamp: string;
};

/**
 * Signals have no real timestamp field (`lib/data/types.ts`'s `Signal` is
 * `{id, project, kind, strength, note}`) — they're always "freshly computed
 * this request," so they're timestamped `now` here rather than backdated,
 * matching the same "just now" convention already used for fresh signals
 * elsewhere (`lib/data/aggregate.ts`'s `getIntelligenceWallDataImpl`).
 */
export function buildProjectTimeline(input: {
  github: GithubIntel;
  governanceEvents: GovernanceEvent[];
  whaleEvents: WhaleEvent[];
  signals: Signal[];
  /** `null` when this project has no TVL tracked — no "TVL change" event is generated in that case (never fabricated). */
  tvl?: Tvl | null;
  /** `null`/omitted skips the risk-alert entry entirely — only "elevated"/"high" ever produce one. */
  risk?: Risk | null;
  /** Real recent transfers for this project's token contract (Blockscout) — `null`/omitted when no token contract is configured. Only the 5 most recent are folded in, so a busy token doesn't drown out every other event kind. */
  tokenTransfers?: TokenTransfer[] | null;
  tokenSymbol?: string | null;
  now?: string;
}): TimelineEvent[] {
  const now = input.now ?? new Date().toISOString();
  const events: TimelineEvent[] = [];

  if (input.github.available && input.github.latestReleaseTag && input.github.latestReleasePublishedAt) {
    events.push({
      id: `release-${input.github.latestReleaseTag}`,
      kind: "release",
      title: `${input.github.latestReleaseTag} released`,
      detail: input.github.fullName,
      timestamp: input.github.latestReleasePublishedAt,
    });
  }

  // Commit activity is a rolling 7-day rollup, not a discrete dated event —
  // timestamped `now` like signals, for the same reason (it's "freshly
  // computed this request," never backdated to an invented date).
  if (input.github.available && input.github.commitsLast7d !== null && input.github.commitsLast7d > 0) {
    events.push({
      id: "commit-activity",
      kind: "commit-activity",
      title: `${input.github.commitsLast7d} commit${input.github.commitsLast7d === 1 ? "" : "s"} in the last 7 days`,
      detail: input.github.fullName,
      timestamp: now,
    });
  }

  // Same "freshly computed, not backdated" treatment as commit activity —
  // real 7d TVL change, derived from DefiLlama's per-protocol history, only
  // surfaced here when the move is large enough to matter (>15%).
  if (input.tvl?.available && input.tvl.changePct7d !== null && Math.abs(input.tvl.changePct7d) >= 15) {
    const up = input.tvl.changePct7d >= 0;
    events.push({
      id: "tvl-change-7d",
      kind: "tvl-change",
      title: `TVL ${up ? "up" : "down"} ${Math.abs(input.tvl.changePct7d).toFixed(1)}% over 7 days`,
      detail: null,
      timestamp: now,
    });
  }

  if (input.risk && (input.risk.level === "elevated" || input.risk.level === "high")) {
    events.push({
      id: "risk-alert",
      kind: "risk-alert",
      title: `${input.risk.level[0].toUpperCase()}${input.risk.level.slice(1)} risk flagged`,
      detail: input.risk.explanation,
      timestamp: now,
    });
  }

  for (const event of input.governanceEvents) {
    events.push({
      id: `governance-${event.proposalId}`,
      kind: "governance",
      title: event.title,
      detail: `${event.status[0].toUpperCase()}${event.status.slice(1)}`,
      timestamp: event.end,
    });
  }

  for (const event of input.whaleEvents) {
    events.push({
      id: `whale-${event.id}`,
      kind: "whale",
      title:
        event.classification === "whale-alert"
          ? `Whale Alert: ${event.tokenSymbol}`
          : `Large transfer: ${event.tokenSymbol}`,
      detail: `$${Math.round(event.usdValue).toLocaleString()}`,
      timestamp: event.timestamp,
    });
  }

  for (const transfer of (input.tokenTransfers ?? []).slice(0, 5)) {
    if (!transfer.timestamp) continue;
    events.push({
      id: `transfer-${transfer.txHash}`,
      kind: "transfer",
      title: `Transfer: ${transfer.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${input.tokenSymbol ?? ""}`.trim(),
      detail: `${transfer.from.slice(0, 6)}…${transfer.from.slice(-4)} → ${transfer.to.slice(0, 6)}…${transfer.to.slice(-4)}`,
      timestamp: transfer.timestamp,
    });
  }

  for (const signal of input.signals) {
    events.push({
      id: `signal-${signal.id}`,
      kind: "signal",
      title: signal.note,
      detail: null,
      timestamp: now,
    });
  }

  const seen = new Set<string>();
  const deduped = events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });

  return deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
