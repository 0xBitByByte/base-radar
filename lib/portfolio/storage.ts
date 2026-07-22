/**
 * Portfolio Intelligence's runtime cache and public entry point — no
 * `localStorage`, no backend, no persistence, same "pure runtime cache"
 * rule `lib/brief/storage.ts` already follows. `cachedPortfolioIntelligence`
 * is rebuilt only when `getWatchlist()` or `getDailyBrief()` returns a
 * genuinely new reference (both services already guarantee their
 * reference only changes on a real recompute); `getIntelligenceAlerts()`
 * is still read fresh on every call to build the "Projects Needing
 * Attention" section, but isn't tracked as a separate cache key — Daily
 * Brief's own cache already rebuilds whenever Intelligence Alerts change,
 * so its reference already proxies for that.
 */

import { getIntelligenceAlerts } from "@/lib/alerts/service";
import { getDailyBrief } from "@/lib/brief/storage";
import type { DailyBrief } from "@/lib/brief/types";
import { buildPortfolioIntelligence } from "@/lib/portfolio/engine";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import { getMembershipWatchlist } from "@/lib/personalization/storage";
import type { PersonalWatchlist } from "@/lib/personalization/types";

let cachedSourceWatchlist: PersonalWatchlist | null = null;
let cachedSourceBrief: DailyBrief | null = null;
let cachedPortfolioIntelligence: PortfolioIntelligence | null = null;

/** The one public entry point — reuses `getWatchlist()`, `getIntelligenceAlerts()`, and `getDailyBrief()`; never touches a provider or rebuilds either upstream engine. */
export function getPortfolioIntelligence(): PortfolioIntelligence {
  const watchlist = getMembershipWatchlist();
  const dailyBrief = getDailyBrief();

  if (cachedPortfolioIntelligence && cachedSourceWatchlist === watchlist && cachedSourceBrief === dailyBrief) {
    return cachedPortfolioIntelligence;
  }

  const alerts = getIntelligenceAlerts();
  cachedSourceWatchlist = watchlist;
  cachedSourceBrief = dailyBrief;
  cachedPortfolioIntelligence = buildPortfolioIntelligence(watchlist, alerts, dailyBrief, new Date().toISOString());
  return cachedPortfolioIntelligence;
}
