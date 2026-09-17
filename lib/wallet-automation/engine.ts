/**
 * V3-WALLET-004 — the orchestrator: given a previous/current
 * `PortfolioIntelligence` snapshot and the current wallet rules, decide
 * which of the 6 rules just triggered and build real `AutomationResult[]`
 * (`lib/automation/types.ts`, unmodified — the exact type `AutomationRuleCard`/
 * `AutomationItem`/`buildAutomationRuleStats` already render/consume).
 *
 * This deliberately does NOT call `lib/automation/engine.ts`'s
 * `buildAutomationResults`/`matchesRule`. Those solve a different problem —
 * matching an arbitrary, already-built `Notification[]` stream against
 * declarative rule conditions — which requires every notification's `type`
 * field to be a real `NotificationType` (`= TimelineEventType`, a closed,
 * exhaustively-consumed union — see `rules.ts`'s own doc comment for why
 * extending it was rejected). Wallet automation doesn't have an ambiguous
 * stream to match: `triggers.ts`'s predicates already know with certainty
 * whether a given wallet condition just became true, so the actual
 * "matching" step the generic engine performs would be redundant machinery
 * here, not genuine reuse. What IS genuinely reused, verbatim, with zero
 * modification: the `AutomationRule`/`AutomationResult` DATA TYPES, the
 * `AutomationRuleCard`/`AutomationMetric`/`AutomationTriggerBadge`/
 * `AutomationActionBadge` UI COMPONENTS, `buildAutomationRuleStats` (works
 * over any `AutomationResult[]`), the `Switch.Root` toggle pattern, and the
 * exact rule-enabled-overlay STORAGE PATTERN (`rules.ts`, mirroring
 * `lib/automation/rules.ts`).
 */

import type { AutomationResult } from "@/lib/automation/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildSmartMetadata } from "@/lib/wallet-automation/smartMetadata";
import * as smartTriggers from "@/lib/wallet-automation/smartTriggers";
import { buildContentEventCopy, buildHealthChangeCopy, buildSmartContentEventCopy } from "@/lib/wallet-automation/summary";
import * as triggers from "@/lib/wallet-automation/triggers";
import type { WalletAutomationRule, WalletRuleId } from "@/lib/wallet-automation/types";

type RuleCheck = {
  ruleId: WalletRuleId;
  didTrigger: (previous: PortfolioIntelligence | null, current: PortfolioIntelligence) => boolean;
  buildCopy: (previous: PortfolioIntelligence | null, current: PortfolioIntelligence) => { title: string; summary: string };
};

/** One entry per wallet rule — the single place a rule id is paired with its real trigger predicate (`triggers.ts`) and its notification copy (`summary.ts`). Adding a 7th wallet rule means adding one entry here, nothing else. */
const RULE_CHECKS: RuleCheck[] = [
  { ruleId: "wallet-rule:concentration", didTrigger: triggers.concentrationJustExceededHigh, buildCopy: (p, c) => buildContentEventCopy("ConcentrationThresholdExceeded", p, c) },
  { ruleId: "wallet-rule:stablecoin", didTrigger: triggers.stablecoinExposureJustDropped, buildCopy: (p, c) => buildContentEventCopy("StablecoinExposureDropped", p, c) },
  { ruleId: "wallet-rule:unknown-assets", didTrigger: triggers.unknownAssetsIncreased, buildCopy: (p, c) => buildContentEventCopy("UnknownAssetsDetected", p, c) },
  { ruleId: "wallet-rule:pricing-coverage", didTrigger: triggers.pricingCoverageJustDropped, buildCopy: (p, c) => buildContentEventCopy("PricingCoverageDropped", p, c) },
  { ruleId: "wallet-rule:largest-holding", didTrigger: triggers.largestHoldingChanged, buildCopy: (p, c) => buildContentEventCopy("LargestHoldingChanged", p, c) },
  { ruleId: "wallet-rule:health", didTrigger: triggers.healthChangedSignificantly, buildCopy: buildHealthChangeCopy },
];

/**
 * Pure and deterministic: same `(previous, current, rules)` in, same
 * `AutomationResult[]` out — no `Date.now()` (uses `current.lastUpdated`),
 * no randomness. `automationEnabled` mirrors the EXISTING global Automation
 * master switch (`lib/automation/preferences.ts`) — wallet rules respect
 * the same on/off switch as every other rule, not a second one.
 */
export function buildWalletAutomationResults(
  previous: PortfolioIntelligence | null,
  current: PortfolioIntelligence,
  rules: WalletAutomationRule[],
  automationEnabled: boolean
): AutomationResult[] {
  if (!automationEnabled) return [];

  const results: AutomationResult[] = [];
  for (const check of RULE_CHECKS) {
    const rule = rules.find((r) => r.id === check.ruleId);
    if (!rule || !rule.enabled) continue;
    if (!check.didTrigger(previous, current)) continue;

    const { title, summary } = check.buildCopy(previous, current);
    const notificationId = `wallet-notification:${check.ruleId}:${current.lastUpdated}`;
    results.push({
      id: `automation:${rule.id}:${notificationId}`,
      ruleId: rule.id,
      notificationId,
      title,
      summary,
      status: "triggered",
      triggeredAt: current.lastUpdated,
      projectId: null,
      projectName: null,
      priority: rule.priority,
      link: "/dashboard/wallet",
      // `trigger`/`actions` mirror the exact shape `lib/automation/engine.ts`'s
      // real `buildAutomationResults` already populates — `components/
      // automation/filters.ts`'s `getResultTrigger`/`getResultActions`
      // (used by `AutomationWidget`'s "Latest Automation" card) read these
      // straight off `metadata`, so a blended widget renders a wallet
      // result's trigger/action badges identically to a watchlist one.
      metadata: { source: "wallet-automation", trigger: rule.trigger, actions: rule.actions },
    });
  }

  // Newest first, matching `buildAutomationResults`'s own guarantee that
  // `buildAutomationRuleStats` (reused unmodified) depends on.
  return results.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
}

type SmartRuleCheck = {
  ruleId: WalletRuleId;
  didTrigger: (previous: PortfolioIntelligence | null, current: PortfolioIntelligence) => boolean;
  buildCopy: (previous: PortfolioIntelligence | null, current: PortfolioIntelligence) => { title: string; summary: string };
  metadataFocus: Parameters<typeof buildSmartMetadata>[1];
};

/** One entry per new smart rule (Phase 3/8) — same shape as `RULE_CHECKS` above, kept as its own array/function rather than appended to `RULE_CHECKS`/`buildWalletAutomationResults` itself, per this phase's explicit "keep buildWalletAutomationResults unchanged" instruction. */
const SMART_RULE_CHECKS: SmartRuleCheck[] = [
  { ruleId: "wallet-rule:confidence", didTrigger: smartTriggers.confidenceDropped, buildCopy: (p, c) => buildSmartContentEventCopy("ConfidenceDropped", p, c), metadataFocus: "general" },
  { ruleId: "wallet-rule:fingerprint", didTrigger: smartTriggers.fingerprintChanged, buildCopy: (p, c) => buildSmartContentEventCopy("FingerprintChanged", p, c), metadataFocus: "general" },
  { ruleId: "wallet-rule:recommendation", didTrigger: smartTriggers.primaryRecommendationChanged, buildCopy: (p, c) => buildSmartContentEventCopy("PrimaryRecommendationChanged", p, c), metadataFocus: "general" },
  { ruleId: "wallet-rule:risk", didTrigger: smartTriggers.riskScoreIncreased, buildCopy: (p, c) => buildSmartContentEventCopy("RiskIncreased", p, c), metadataFocus: "general" },
  { ruleId: "wallet-rule:top-warning", didTrigger: smartTriggers.topWarningChanged, buildCopy: (p, c) => buildSmartContentEventCopy("TopWarningChanged", p, c), metadataFocus: "top-warning" },
];

/**
 * V4-AUTOMATION-001 (Phase 3/5) — the 5 new smart rules' own results
 * builder, structurally identical to `buildWalletAutomationResults` above
 * (same `AutomationResult` shape, same enabled-rule/trigger/sort logic) but
 * kept as a genuinely separate function so the original is never touched.
 * `metadata` carries this phase's structured fields (Phase 5) — `reason`/
 * `relatedAssets`/`relatedProtocols`/`estimatedImpact`/`confidence`/
 * `severity` — alongside the same `source`/`trigger`/`actions` shape the
 * original results already use, so `AutomationItem`/`AutomationRuleCard`
 * render these identically to every other result with zero new UI code.
 */
export function buildSmartWalletAutomationResults(
  previous: PortfolioIntelligence | null,
  current: PortfolioIntelligence,
  rules: WalletAutomationRule[],
  automationEnabled: boolean
): AutomationResult[] {
  if (!automationEnabled) return [];

  const results: AutomationResult[] = [];
  for (const check of SMART_RULE_CHECKS) {
    const rule = rules.find((r) => r.id === check.ruleId);
    if (!rule || !rule.enabled) continue;
    if (!check.didTrigger(previous, current)) continue;

    const { title, summary } = check.buildCopy(previous, current);
    const notificationId = `wallet-notification:${check.ruleId}:${current.lastUpdated}`;
    results.push({
      id: `automation:${rule.id}:${notificationId}`,
      ruleId: rule.id,
      notificationId,
      title,
      summary,
      status: "triggered",
      triggeredAt: current.lastUpdated,
      projectId: null,
      projectName: null,
      priority: rule.priority,
      link: "/dashboard/wallet",
      metadata: { source: "wallet-automation", trigger: rule.trigger, actions: rule.actions, ...buildSmartMetadata(current, check.metadataFocus) },
    });
  }

  return results.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
}
