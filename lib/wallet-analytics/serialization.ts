/**
 * V4-ANALYTICS-001C (Phase 4) — Stable Serialization. `AutomationSnapshot`
 * is already 100% plain, JSON-safe data (no class instances, no functions,
 * timestamps are already ISO strings) — `serializeAnalyticsSnapshot` is
 * therefore a thin, deterministic `JSON.stringify`, not a new encoding.
 * `deserializeAnalyticsSnapshot` is the real work: it validates the parsed
 * shape has every field this version of `AutomationSnapshot` requires, and
 * is VERSION-AWARE via `analyticsVersion` (`lib/wallet-automation/types.ts`)
 * so a future History module can persist snapshots across app versions
 * without either losing data or silently misreading an incompatible shape.
 *
 * These two functions are what a future History module should call to
 * persist/restore snapshots — never `JSON.parse`/`JSON.stringify` directly,
 * so the version-aware validation always runs.
 *
 * Upgrade path for a FUTURE version bump (there is only one version today):
 * when `AutomationSnapshot` next changes shape, bump
 * `CURRENT_ANALYTICS_SNAPSHOT_VERSION`, then add a real `if (version === N)
 * { ...upgrade fields... }` step here for exactly that transition — never
 * change this function's overall shape or the meaning of an already-shipped
 * version number.
 */

import { CURRENT_ANALYTICS_SNAPSHOT_VERSION } from "@/lib/wallet-automation/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

/** Every field version 1 of `AutomationSnapshot` requires, EXCLUDING `analyticsVersion` itself (checked separately, since it's the one field allowed to be absent on genuinely pre-versioning data). */
const REQUIRED_V1_KEYS: (keyof Omit<AutomationSnapshot, "analyticsVersion">)[] = [
  "timestamp",
  "overallScore",
  "healthScore",
  "riskScore",
  "confidenceScore",
  "confidenceLevel",
  "fingerprint",
  "largestHoldingSymbol",
  "largestProtocolName",
  "primaryRecommendationId",
  "topWarningId",
  "totalValue",
  "stablecoinExposure",
  "ethPct",
  "diversificationScore",
  "pricingCoverage",
  "unknownAssetCount",
  "warningIds",
  "topHoldings",
];

export function serializeAnalyticsSnapshot(snapshot: AutomationSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Returns `null` — never throws — for anything that isn't a real,
 * understandable `AutomationSnapshot`: malformed JSON, a missing required
 * field, a corrupted `analyticsVersion`, or a version NEWER than this build
 * of the code understands (refuse rather than silently misread data a
 * future version wrote). Data with no `analyticsVersion` at all is treated
 * as real, valid pre-versioning data (version 0) and upgraded losslessly —
 * version 1 adds only the version marker itself, no field changed shape.
 */
export function deserializeAnalyticsSnapshot(raw: string): AutomationSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;

  let version: number;
  if (!("analyticsVersion" in candidate)) {
    version = 0;
  } else if (typeof candidate.analyticsVersion === "number" && Number.isInteger(candidate.analyticsVersion) && candidate.analyticsVersion >= 0) {
    version = candidate.analyticsVersion;
  } else {
    return null;
  }

  if (version > CURRENT_ANALYTICS_SNAPSHOT_VERSION) return null;

  for (const key of REQUIRED_V1_KEYS) {
    if (!(key in candidate)) return null;
  }

  // version 0 -> 1: no field changed shape, only the version marker was
  // added, so every real field on `candidate` carries through unchanged —
  // no data loss.
  return { ...(candidate as unknown as AutomationSnapshot), analyticsVersion: CURRENT_ANALYTICS_SNAPSHOT_VERSION };
}
