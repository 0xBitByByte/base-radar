/**
 * The Intelligence Timeline's runtime cache and public entry point — no
 * `localStorage`, no backend, no persistence, same "pure runtime cache"
 * rule `lib/brief/storage.ts` and `lib/portfolio/storage.ts` already
 * follow. `cachedTimeline` is rebuilt only when `getIntelligenceAlerts()`,
 * `getDailyBrief()`, or `getPortfolioIntelligence()` returns a genuinely
 * new reference — all three already guarantee stable references between
 * real changes, and Daily Brief's/Portfolio Intelligence's own references
 * already change whenever Intelligence Alerts do, so tracking all three
 * here is what actually catches every real trigger this layer depends on.
 */

import { getIntelligenceAlerts } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import { getDailyBrief } from "@/lib/brief/storage";
import type { DailyBrief } from "@/lib/brief/types";
import { getPortfolioIntelligence } from "@/lib/portfolio/storage";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import { buildTimeline } from "@/lib/timeline/engine";
import type { Timeline } from "@/lib/timeline/types";

let cachedSourceAlerts: IntelligenceAlert[] | null = null;
let cachedSourceBrief: DailyBrief | null = null;
let cachedSourcePortfolio: PortfolioIntelligence | null = null;
let cachedTimeline: Timeline | null = null;

/** The one public entry point — reuses `getIntelligenceAlerts()`, `getDailyBrief()`, and `getPortfolioIntelligence()`; never touches a provider or rebuilds any upstream engine. */
export function getTimeline(): Timeline {
  const alerts = getIntelligenceAlerts();
  const dailyBrief = getDailyBrief();
  const portfolio = getPortfolioIntelligence();

  if (
    cachedTimeline &&
    cachedSourceAlerts === alerts &&
    cachedSourceBrief === dailyBrief &&
    cachedSourcePortfolio === portfolio
  ) {
    return cachedTimeline;
  }

  cachedSourceAlerts = alerts;
  cachedSourceBrief = dailyBrief;
  cachedSourcePortfolio = portfolio;
  cachedTimeline = buildTimeline(alerts, dailyBrief, portfolio, new Date().toISOString());
  return cachedTimeline;
}
