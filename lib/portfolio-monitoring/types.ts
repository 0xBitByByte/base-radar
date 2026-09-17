/**
 * PR-092.04 (Portfolio Monitoring) — alerts specifically about EXTERNAL
 * events on projects the connected wallet actually holds (a real whale
 * transfer, a real new governance proposal), never about the wallet's own
 * composition — that is `lib/wallet-automation/`'s job (concentration,
 * stablecoin %, health/risk/confidence changes) and is deliberately left
 * untouched by this module. Same discipline `lib/ai-watch/` established for
 * "AI Watch is Watchlist-scoped, not the same thing as the Alert Engine":
 * this is Holdings-scoped, not the same thing as either Wallet Automation
 * or the Watchlist-scoped Alert Engine/AI Watch.
 *
 * Client-side, on-visit-only evaluation (no scheduler, no background
 * worker) — the same "checks when you open the page" contract AI Watch's
 * own trust copy already established for this app.
 */

export type PortfolioMonitoringConfig = {
  enabled: boolean;
  createdAt: string | null;
};

export type PortfolioAlertKind = "whale" | "governance";

export type PortfolioMonitoringAlert = {
  /** `portfolio-watch:${kind}:${dedupeKey}` — deterministic, so the same real event/state is never persisted twice. */
  id: string;
  kind: PortfolioAlertKind;
  firstSeenAt: string;
  isRead: boolean;
  readAt: string | null;
  projectId: string;
  projectName: string;
  projectSlug: string | null;
  headline: string;
  detail: string;
};

/** Mirrors `AIWatchStatus` exactly: `"unavailable"` never evaluates or fires. */
export type PortfolioMonitoringStatus = "ready" | "checking" | "unavailable";
