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
  state: "active" | "closed" | "pending";
  start: number;
  end: number;
  scores_total: number;
  quorum: number;
  link: string;
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
      state
      start
      end
      scores_total
      quorum
      link
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
