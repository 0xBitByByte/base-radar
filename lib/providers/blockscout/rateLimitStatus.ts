/**
 * Final Production Hardening PR — split out of `blockscout/service.ts`,
 * mirroring `blockscout/contractDetails.ts`'s same reasoning: pure,
 * no-fetch code that a client component needs (here, transitively — see
 * below) must live outside any module that also imports `blockscout/client.ts`.
 *
 * `ProfileSources.tsx`'s `classifyBlockscoutVerification` (re-exported by
 * `ProfileSourcesBlockscoutAsync`, a `"use client"` component) calls
 * `describeUnavailable`, which reads every provider's `getRateLimitStatus`
 * through one shared lookup table — including this one. Live bundle
 * inspection confirmed that importing `getRateLimitStatus` from
 * `blockscout/service.ts` (even though `classifyBlockscoutVerification`
 * itself is otherwise pure) pulled `blockscout/client.ts`'s real `fetch()`
 * calls into the client bundle, the same "whole module ships because one
 * export is reachable" mechanism `contractDetailsByAddress` already had.
 */

import { getRateLimitStatus as getSharedRateLimitStatus, type RateLimitConfig } from "@/lib/providers/common/rate-limit";

const PROVIDER = "blockscout" as const;
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export function getRateLimitStatus() {
  return getSharedRateLimitStatus(PROVIDER, RATE_LIMIT);
}
