/**
 * Final Production Hardening PR — split out of `defillama/service.ts` for
 * the same reason as `blockscout/rateLimitStatus.ts`: `ProfileSources.tsx`'s
 * shared rate-limit lookup table needs this without pulling
 * `defillama/client.ts`'s real `fetch()` calls into any client bundle that
 * transitively reaches it.
 */

import { getRateLimitStatus as getSharedRateLimitStatus, type RateLimitConfig } from "@/lib/providers/common/rate-limit";

const PROVIDER = "defillama" as const;
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export function getRateLimitStatus() {
  return getSharedRateLimitStatus(PROVIDER, RATE_LIMIT);
}
