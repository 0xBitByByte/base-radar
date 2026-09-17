/**
 * Snapshot.org's free, public GraphQL API — no API key required.
 * https://docs.snapshot.org/tools/api
 *
 * Snapshot isn't one of this app's six "Trusted Data Sources" (that list —
 * and its UI registry in `lib/branding/providers.ts` — is a curated,
 * design-locked set; see the PR10 plan), so it deliberately isn't part of
 * the shared `ProviderName` union those registries are keyed by. The local
 * `PROVIDER_TAG` cast below lets this module still reuse `fetchJson`'s
 * retry/timeout handling — that function only ever uses the value as a
 * string tag for error attribution and cache/rate-limit bucket keys, never
 * for exhaustive branching, so widening it here is safe.
 */

import { fetchJson } from "@/lib/providers/common/utilities";
import type { ProviderName } from "@/lib/providers/common/types";

const GRAPHQL_URL = "https://hub.snapshot.org/graphql";
const PROVIDER_TAG = "snapshot" as ProviderName;

export type RawSnapshotProposal = {
  id: string;
  title: string;
  /** Real proposal description/body, Markdown — PR13.7 Goal 12, Snapshot always has this field, it just wasn't requested before. */
  body: string;
  state: "active" | "closed" | "pending";
  start: number;
  end: number;
  scores_total: number;
  quorum: number;
  link: string;
  /** Real voter *count*, distinct from `scores_total`'s voting *power* — PR-084.04, live-verified against Snapshot's real schema. `null` only if Snapshot itself omits it. */
  votes: number | null;
  /** Real forum discussion URL, distinct from `link` (Snapshot's own permalink) — PR-084.04, live-verified real. */
  discussion: string | null;
  /** Real proposer address — PR-084.04, live-verified real. */
  author: string | null;
};

type RawProposalsResponse = {
  data: { proposals: RawSnapshotProposal[] } | null;
  errors?: Array<{ message: string }>;
};

const PROPOSALS_QUERY = `
  query Proposals($space: String!) {
    proposals(where: { space: $space }, orderBy: "created", orderDirection: desc, first: 20) {
      id
      title
      body
      state
      start
      end
      scores_total
      quorum
      link
      votes
      discussion
      author
    }
  }
`;

export async function fetchProposals(space: string): Promise<RawSnapshotProposal[]> {
  const res = await fetchJson<RawProposalsResponse>(PROVIDER_TAG, GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: PROPOSALS_QUERY, variables: { space } }),
  });
  if (res.errors?.length) {
    throw new Error(`Snapshot GraphQL error: ${res.errors[0].message}`);
  }
  return res.data?.proposals ?? [];
}

/** Same shape as `RawSnapshotProposal`, plus which space it belongs to — only meaningful for the multi-space batched query below, where results from several spaces are interleaved in one list. */
export type RawSnapshotProposalWithSpace = RawSnapshotProposal & { space: { id: string } };

type RawProposalsForSpacesResponse = {
  data: { proposals: RawSnapshotProposalWithSpace[] } | null;
  errors?: Array<{ message: string }>;
};

/**
 * MASTER HARDENING PASS — Concern 1 (API cost audit). One real, verified
 * capability of Snapshot's public GraphQL API (confirmed live against
 * `hub.snapshot.org/graphql` before writing this, not assumed): `where`
 * accepts `space_in: [String!]`, so every registry project's governance
 * space can be queried in a SINGLE request instead of one per project —
 * `fetchProposals` above stays untouched for its own (single-space)
 * callers; this is an addition, not a replacement.
 *
 * `first: 200`, sorted by `created desc` GLOBALLY across every matched
 * space (Snapshot's API has no native "top-N per group") — a deliberate,
 * documented assumption: this is only correct as long as no single space
 * in `spaces` produces enough very-recent proposals to push another
 * space's own most-recent proposal past the 200th slot. For the current
 * ~9 configured registry spaces (real, low-volume governance forums, not
 * high-frequency ones), 200 is a wide margin — but this is a genuine
 * limitation of the batching approach, not a mathematical guarantee, and
 * is why `getProposalsForSpaces` (service.ts) is documented to verify
 * every requested space actually appears before trusting an empty result
 * as "no proposals" rather than "crowded out."
 */
const PROPOSALS_FOR_SPACES_QUERY = `
  query ProposalsForSpaces($spaces: [String!]) {
    proposals(where: { space_in: $spaces }, orderBy: "created", orderDirection: desc, first: 200) {
      id
      title
      body
      state
      start
      end
      scores_total
      quorum
      link
      votes
      discussion
      author
      space {
        id
      }
    }
  }
`;

export async function fetchProposalsForSpaces(spaces: string[]): Promise<RawSnapshotProposalWithSpace[]> {
  const res = await fetchJson<RawProposalsForSpacesResponse>(PROVIDER_TAG, GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: PROPOSALS_FOR_SPACES_QUERY, variables: { spaces } }),
  });
  if (res.errors?.length) {
    throw new Error(`Snapshot GraphQL error: ${res.errors[0].message}`);
  }
  return res.data?.proposals ?? [];
}
