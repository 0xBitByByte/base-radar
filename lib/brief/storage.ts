/**
 * The Daily Brief's runtime cache and public entry point — no
 * `localStorage`, no backend, no persistence of any kind, per PR16 Part
 * 1's spec ("pure runtime cache"). `cachedDailyBrief` is rebuilt only when
 * `lib/alerts/service.ts`'s `getIntelligenceAlerts()` returns a genuinely
 * new array reference (that service's own cached-snapshot contract already
 * guarantees the reference only changes on a real recompute — a mutation,
 * a provider refresh, or a Watchlist change), so calling `getDailyBrief()`
 * on every render is cheap: most calls just return the same cached object.
 */

import { getIntelligenceAlerts } from "@/lib/alerts/service";
import { buildDailyBrief } from "@/lib/brief/engine";
import type { DailyBrief } from "@/lib/brief/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

let cachedSourceAlerts: IntelligenceAlert[] | null = null;
let cachedDailyBrief: DailyBrief | null = null;

/** The one public entry point — reuses `getIntelligenceAlerts()`, never touches raw provider alerts, never rebuilds the Intelligence Engine. */
export function getDailyBrief(): DailyBrief {
  const currentAlerts = getIntelligenceAlerts();

  if (cachedDailyBrief && cachedSourceAlerts === currentAlerts) {
    return cachedDailyBrief;
  }

  cachedSourceAlerts = currentAlerts;
  cachedDailyBrief = buildDailyBrief(currentAlerts, new Date().toISOString());
  return cachedDailyBrief;
}
