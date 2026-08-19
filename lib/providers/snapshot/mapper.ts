/** Raw Snapshot GraphQL responses → domain models. Pure functions, no I/O. */

import type { RawSnapshotProposal } from "@/lib/providers/snapshot/client";

export type SnapshotProposal = {
  id: string;
  title: string;
  /** Real proposal description (PR13.7 Goal 12) — `null` when Snapshot returned an empty body, never fabricated. */
  description: string | null;
  status: "active" | "passed" | "failed" | "pending";
  start: string;
  end: string;
  participation: number | null;
  quorumMet: boolean | null;
  url: string;
  /** Real voter count (PR-084.04) — a more honest participation basis than `participation` (voting power, skewed by large holders). `null` only if Snapshot itself omits it. */
  voterCount: number | null;
  /** Real forum discussion URL (PR-084.04), distinct from `url`. `null` when Snapshot has none on record. */
  discussionUrl: string | null;
  /** Real proposer address (PR-084.04). `null` when Snapshot has none on record. */
  proposerAddress: string | null;
};

/**
 * `raw.link` is untrusted external data — Snapshot's public API, not
 * something this app controls. It's rendered directly as an anchor `href`
 * (`components/explorer/QuickViewCommunity.tsx`), so a non-`http(s)` value
 * (e.g. a `javascript:` URI from a compromised/malicious response) must
 * never reach that far. Falls back to Snapshot's own site rather than an
 * empty string so the link is still something real, just not attacker-controlled.
 */
function sanitizeExternalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // Malformed URL — fall through to the safe default below.
  }
  return "https://snapshot.org";
}

/**
 * Same untrusted-URL concern as `sanitizeExternalUrl`, for a genuinely
 * optional field (`discussion`) — PR-084.04. Unlike `link`, there's no
 * "always a real Snapshot page" fallback that makes sense here, so a
 * missing or malformed value maps to `null` (rendered as no link) rather
 * than a misleading substitute.
 */
function sanitizeOptionalExternalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // Malformed URL — falls through to `null` below.
  }
  return null;
}

/**
 * Snapshot's own `state` field only distinguishes pending/active/closed —
 * it has no pass/fail concept, since a Snapshot vote is a signal, not an
 * on-chain execution. For a closed proposal, we treat quorum being met with
 * net-positive score as "passed" — a reasonable, transparent heuristic, not
 * an authoritative execution result.
 */
function mapStatus(raw: RawSnapshotProposal): SnapshotProposal["status"] {
  if (raw.state === "pending") return "pending";
  if (raw.state === "active") return "active";
  if (raw.quorum > 0 && raw.scores_total < raw.quorum) return "failed";
  return "passed";
}

export function mapProposal(raw: RawSnapshotProposal): SnapshotProposal {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.body ? raw.body.trim() || null : null,
    status: mapStatus(raw),
    start: new Date(raw.start * 1000).toISOString(),
    end: new Date(raw.end * 1000).toISOString(),
    participation: raw.scores_total || null,
    quorumMet: raw.quorum > 0 ? raw.scores_total >= raw.quorum : null,
    url: sanitizeExternalUrl(raw.link),
    voterCount: raw.votes ?? null,
    discussionUrl: sanitizeOptionalExternalUrl(raw.discussion),
    proposerAddress: raw.author || null,
  };
}

export function mapProposals(raw: RawSnapshotProposal[]): SnapshotProposal[] {
  return raw.map(mapProposal);
}
