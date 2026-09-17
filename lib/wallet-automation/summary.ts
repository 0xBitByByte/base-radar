/**
 * V3-WALLET-004 — one title/summary sentence builder per `WalletEventKind`,
 * matching the empty-state-first, template-built-from-real-numbers
 * convention `lib/portfolio-intelligence/summary.ts` and
 * `lib/portfolio/summary.ts` already establish. Every sentence below
 * interpolates a real, already-computed number or symbol — never a fixed,
 * generic string detached from the actual snapshot that triggered it.
 */

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export type EventCopy = { title: string; summary: string };

export type ContentEventKind =
  | "PortfolioScoreChanged"
  | "RiskLevelChanged"
  | "ConcentrationThresholdExceeded"
  | "StablecoinExposureDropped"
  | "StablecoinExposureRecovered"
  | "PricingCoverageDropped"
  | "PricingCoverageRecovered"
  | "UnknownAssetsDetected"
  | "LargestHoldingChanged"
  | "PortfolioValueChanged";

/** V4-AUTOMATION-001 (Phase 3) — the 9 new "smart" content kinds, handled by the separate `buildSmartContentEventCopy` below rather than folded into `buildContentEventCopy`'s own switch, so that function's exhaustiveness/shape stays exactly what it was. */
export type SmartContentEventKind =
  | "ConfidenceIncreased"
  | "ConfidenceDropped"
  | "FingerprintChanged"
  | "PrimaryRecommendationChanged"
  | "RiskIncreased"
  | "RiskDecreased"
  | "LargestProtocolChanged"
  | "TopContributorChanged"
  | "TopWarningChanged";

export type LifecycleEventKind = "WalletConnected" | "WalletDisconnected" | "UnsupportedNetwork" | "RefreshCompleted";

/** The 9 content-diff kinds only — each reads real fields off `previous`/`current`, so lifecycle kinds are handled by the separate `buildLifecycleEventCopy` below instead of forcing a fake `PortfolioIntelligence` through this signature. */
export function buildContentEventCopy(kind: ContentEventKind, previous: PortfolioIntelligence | null, current: PortfolioIntelligence): EventCopy {
  switch (kind) {
    case "PortfolioScoreChanged": {
      const delta = current.overallScore - (previous?.overallScore ?? current.overallScore);
      return {
        title: "Portfolio score changed",
        summary: `Overall score moved ${delta >= 0 ? "up" : "down"} to ${current.overallScore}/100 (${delta >= 0 ? "+" : ""}${delta}).`,
      };
    }
    case "RiskLevelChanged":
      return {
        title: "Risk level changed",
        summary: `Concentration risk is now ${current.concentrationRisk.level}${previous ? `, was ${previous.concentrationRisk.level}` : ""}.`,
      };
    case "ConcentrationThresholdExceeded":
      return {
        title: "High concentration detected",
        summary: current.largestHolding
          ? `${current.largestHolding.symbol} is now ${current.largestHolding.allocationPct.toFixed(1)}% of your known portfolio value.`
          : "Your portfolio is now highly concentrated in one asset.",
      };
    case "StablecoinExposureDropped":
      return { title: "Stablecoin exposure dropped", summary: "No defensive allocation detected — your stablecoin exposure is now 0%." };
    case "StablecoinExposureRecovered":
      return {
        title: "Stablecoin exposure recovered",
        summary: `Stablecoin exposure is back above 0% (${current.stablecoinExposure.toFixed(1)}%).`,
      };
    case "PricingCoverageDropped":
      return {
        title: "Pricing coverage dropped",
        summary: `Only ${current.pricingCoverage}% of your holdings are priced — portfolio visibility is limited.`,
      };
    case "PricingCoverageRecovered":
      return { title: "Pricing coverage improved", summary: `${current.pricingCoverage}% of your holdings are now priced.` };
    case "UnknownAssetsDetected":
      return {
        title: "Unknown asset added",
        summary: `${current.unknownAssetCount} asset${current.unknownAssetCount === 1 ? "" : "s"} in your wallet could not be priced — review recommended.`,
      };
    case "LargestHoldingChanged":
      return {
        title: "Largest position changed",
        summary:
          previous?.largestHolding && current.largestHolding
            ? `Largest position changed from ${previous.largestHolding.symbol} to ${current.largestHolding.symbol}.`
            : current.largestHolding
              ? `Largest position is now ${current.largestHolding.symbol}.`
              : "No priced holdings remain to determine a largest position.",
      };
    case "PortfolioValueChanged": {
      const delta = current.totalUsdValue - (previous?.totalUsdValue ?? current.totalUsdValue);
      return {
        title: "Portfolio value changed",
        summary: `Known portfolio value is now ${USD_FORMAT.format(current.totalUsdValue)} (${delta >= 0 ? "+" : ""}${USD_FORMAT.format(delta)}).`,
      };
    }
  }
}

/** The 4 lifecycle kinds — static copy, since none of them describe a portfolio-content change; there's nothing real to interpolate beyond what the kind itself already says. */
export function buildLifecycleEventCopy(kind: LifecycleEventKind): EventCopy {
  switch (kind) {
    case "WalletConnected":
      return { title: "Wallet connected", summary: "Wallet automation is now watching this wallet's portfolio." };
    case "WalletDisconnected":
      return { title: "Wallet disconnected", summary: "Wallet automation is paused until a wallet reconnects." };
    case "UnsupportedNetwork":
      return { title: "Unsupported network", summary: "Switch to a supported Base network to resume wallet automation." };
    case "RefreshCompleted":
      return { title: "Refresh completed", summary: "Your portfolio was refreshed with the latest on-chain data." };
  }
}

/**
 * V4-AUTOMATION-001 (Phase 4) — enriched in place (same signature, same
 * caller in `engine.ts`'s `RULE_CHECKS` — nothing about how this is wired
 * changed): now names the real before → after scores, the real contributor
 * that resolved or newly appeared (from `current`/`previous`'s own
 * `negativeContributors`, already deduplicated by
 * `lib/portfolio-intelligence/contributors.ts` — never re-derived here),
 * and the current top recommendation's own `explanation` as the
 * recommended action. Every clause is conditional on real data existing;
 * an improvement with no specific resolved contributor (e.g. several small
 * ones each moved a little) simply omits the "no longer flagged" clause
 * rather than guessing one.
 */
export function buildHealthChangeCopy(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): EventCopy {
  const delta = current.healthScore - (previous?.healthScore ?? current.healthScore);
  const improved = delta >= 0;

  const scoreClause = previous
    ? `Health score ${improved ? "improved" : "declined"} from ${previous.healthScore} to ${current.healthScore} (${delta >= 0 ? "+" : ""}${delta}).`
    : `Health score is now ${current.healthScore}/100.`;

  const previousNegativeIds = new Set((previous?.negativeContributors ?? []).map((c) => c.id));
  const currentNegativeIds = new Set(current.negativeContributors.map((c) => c.id));
  const resolvedContributor = previous?.negativeContributors.find((c) => !currentNegativeIds.has(c.id)) ?? null;
  const newContributor = current.negativeContributors.find((c) => !previousNegativeIds.has(c.id)) ?? null;

  const reasonClause = improved
    ? resolvedContributor
      ? ` No longer flagged: ${resolvedContributor.title.toLowerCase()}.`
      : ""
    : newContributor
      ? ` New concern: ${newContributor.title.toLowerCase()}.`
      : "";

  const actionClause = current.recommendations[0] ? ` ${current.recommendations[0].explanation}` : "";

  return {
    title: improved ? "Portfolio health improved" : "Portfolio health declined",
    summary: `${scoreClause}${reasonClause}${actionClause}`,
  };
}

/**
 * V4-AUTOMATION-001 (Phase 3/4) — copy for the 9 new smart content kinds.
 * Every sentence reads a real, already-computed `PortfolioIntelligence`
 * field (`confidenceScore`/`fingerprint`/`recommendations[0]`/`riskScore`/
 * `largestProtocol`/`negativeContributors[0]`/`warnings[0]`) — never a new
 * calculation. Where a "recommended action" applies, it's the current top
 * recommendation's own `explanation`, appended as-is.
 */
export function buildSmartContentEventCopy(kind: SmartContentEventKind, previous: PortfolioIntelligence | null, current: PortfolioIntelligence): EventCopy {
  const nextAction = current.recommendations[0] ? ` ${current.recommendations[0].explanation}` : "";

  switch (kind) {
    case "ConfidenceIncreased":
      return {
        title: "Portfolio confidence increased",
        summary: `Confidence is now ${current.confidenceScore}% (${current.confidenceLevel})${previous ? `, up from ${previous.confidenceScore}%` : ""}.`,
      };
    case "ConfidenceDropped":
      return {
        title: "Portfolio confidence dropped",
        summary: `Confidence is now ${current.confidenceScore}% (${current.confidenceLevel})${previous ? `, down from ${previous.confidenceScore}%` : ""} — pricing, verification, or classification coverage got materially worse.`,
      };
    case "FingerprintChanged":
      return {
        title: "Portfolio type changed",
        summary: `Your portfolio now reads as ${current.fingerprint}${previous ? ` (was ${previous.fingerprint})` : ""}. ${current.fingerprintReason}`,
      };
    case "PrimaryRecommendationChanged":
      return {
        title: "Top recommendation changed",
        summary: current.recommendations[0] ? `New top recommendation: ${current.recommendations[0].title}. ${current.recommendations[0].explanation}` : "No recommendations stand out right now.",
      };
    case "RiskIncreased":
      return {
        title: "Risk score increased",
        summary: `Risk score is now ${current.riskScore}/100${previous ? `, up from ${previous.riskScore}` : ""}.${nextAction}`,
      };
    case "RiskDecreased":
      return {
        title: "Risk score decreased",
        summary: `Risk score is now ${current.riskScore}/100${previous ? `, down from ${previous.riskScore}` : ""}.`,
      };
    case "LargestProtocolChanged":
      return {
        title: "Largest protocol exposure changed",
        summary:
          previous?.largestProtocol && current.largestProtocol
            ? `Largest protocol exposure changed from ${previous.largestProtocol.name} to ${current.largestProtocol.name}.`
            : current.largestProtocol
              ? `Largest protocol exposure is now ${current.largestProtocol.name}.`
              : "No recognized protocol exposure remains.",
      };
    case "TopContributorChanged": {
      const top = current.negativeContributors[0] ?? null;
      return {
        title: "Top risk factor changed",
        summary: top ? `${top.title} is now your top risk factor. ${top.description}` : "No risk factors are currently flagged.",
      };
    }
    case "TopWarningChanged": {
      const top = current.warnings[0] ?? null;
      return {
        title: "Top warning changed",
        summary: top ? `${top.title}. ${top.description}` : "No warnings are currently active.",
      };
    }
  }
}
