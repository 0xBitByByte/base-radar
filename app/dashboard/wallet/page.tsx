import type { Metadata } from "next";

import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { WalletPortfolioPage } from "@/components/wallet/WalletPortfolioPage";

export const metadata: Metadata = {
  title: "Wallet",
  description: "Your real, on-chain holdings on Base — balances, USD value, and allocation.",
};

/**
 * V3-WALLET-002 — a dedicated route, not `/dashboard/portfolio`: that route
 * is already the unrelated "Portfolio Intelligence" feature (watchlist
 * analytics — `components/portfolio/PortfolioOverview.tsx`), confirmed
 * during this feature's own required investigation pass. No sidebar entry
 * (matching `/dashboard/portfolio`'s own existing precedent — neither page
 * is in `DASHBOARD_NAV_GROUPS`); reachable via the Dashboard's `PortfolioWidget`
 * "View full portfolio" link.
 *
 * PR-092.03/PR-092.04 — this page gained its first real server-side fetch.
 * Which HOLDINGS a wallet has is still entirely client-only (`usePortfolio()`
 * needs the connected wallet's address), but WHICH REGISTRY PROJECTS exist,
 * their real intelligence, and today's Smart Collection membership are all
 * server data this page can fetch once and pass down — the same
 * `getLiveProjects()`/`getRawWhaleEvents()` pattern `/dashboard/watchlists`
 * and `/dashboard/compare` already established for the identical reason
 * (client-only selection, server-known universe). Cross-referencing which
 * of those projects the connected wallet actually holds happens client-side,
 * in `WalletPortfolioPage`, once real holdings are known.
 */
export default async function WalletPage() {
  const [liveProjects, whaleEvents] = await Promise.all([getLiveProjects(), getRawWhaleEvents()]);
  const serverCollections = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <WalletPortfolioPage liveProjects={liveProjects} whaleEvents={whaleEvents} serverCollections={serverCollections} />;
}
