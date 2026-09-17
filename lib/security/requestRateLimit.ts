/**
 * PR-097.05 (Security) — real, per-IP rate limiting for the unauthenticated
 * public API routes that create real server-side state with no session to
 * charge the cost to (SIWE challenges, observability ingest). Two of those
 * routes' own doc comments (`/api/observability/events`,
 * `/api/observability/web-vitals`) already named this PR as the place this
 * gets addressed — this file is that fix.
 *
 * Reuses the existing fixed-window limiter
 * (`lib/providers/common/rate-limit.ts`'s `tryAcquire`) rather than a
 * second mechanism — that function is already provider-agnostic (a plain
 * `key: string` + `{limit, windowMs}` budget), just conventionally used for
 * outbound provider calls until now. In-memory only, matching `fly.toml`'s
 * own documented "one Machine, one Volume, no horizontal scaling" staging
 * architecture — a distributed store would be solving a scaling problem
 * this app doesn't have yet, and would need its own new infrastructure
 * dependency this phase's rules say not to introduce speculatively.
 */

import type { NextRequest } from "next/server";

import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";

/**
 * Fly's proxy sets `Fly-Client-IP` on every request it forwards to this
 * app's Machine; `X-Forwarded-For` is the standard fallback for any other
 * reverse-proxy front end (including local `next dev`, which sets
 * neither — real local requests all share the harmless `"unknown"` bucket).
 * Never read from a client-controlled body/query field — an IP a request
 * could simply assert would make this limiter trivially bypassable.
 */
export function getClientIp(request: NextRequest): string {
  const flyClientIp = request.headers.get("fly-client-ip");
  if (flyClientIp) return flyClientIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

  return "unknown";
}

/**
 * Real per-IP, per-route budget check. `routeKey` scopes each endpoint's
 * budget separately, so a client exhausting one route's limit never spends
 * another's. Returns `true` once `config.limit` requests from the same IP
 * have landed within `config.windowMs` — the caller's job is to turn that
 * into an honest 429, never to silently drop or silently allow the request.
 */
export function isRequestRateLimited(request: NextRequest, routeKey: string, config: RateLimitConfig): boolean {
  const ip = getClientIp(request);
  return !tryAcquire(`${routeKey}:${ip}`, config);
}
