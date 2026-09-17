"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gauge, History, Settings, Wallet, Zap } from "lucide-react";

import { AutomationEmpty } from "@/components/automation/AutomationEmpty";
import { AutomationFilters } from "@/components/automation/AutomationFilters";
import { AutomationGroup } from "@/components/automation/AutomationGroup";
import { AutomationItem } from "@/components/automation/AutomationItem";
import { AutomationMetric } from "@/components/automation/AutomationMetric";
import { AutomationRuleCard } from "@/components/automation/AutomationRuleCard";
import {
  filterAutomationResultsByAction,
  filterAutomationResultsByPriority,
  filterAutomationResultsByQuery,
} from "@/components/automation/filters";
import { AUTOMATION_GROUP_KEYS, AUTOMATION_GROUP_LABEL, groupAutomationResults } from "@/components/automation/grouping";
import { buildAutomationRuleStats, getAutomationRuleStats } from "@/components/automation/ruleStats";
import { buildAutomationSummary } from "@/components/automation/summary";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { useAutomation } from "@/lib/hooks/useAutomation";
import { useAutomationMetrics } from "@/lib/hooks/useAutomationMetrics";
import { useAutomationRules } from "@/lib/hooks/useAutomationRules";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import { useWallet } from "@/lib/hooks/useWallet";
import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useCrossFeatureIntelligence } from "@/lib/hooks/useCrossFeatureIntelligence";
import { useAIChat } from "@/lib/hooks/useAIChat";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { AutomationAction } from "@/lib/automation/types";
import type { NotificationPriority } from "@/lib/notifications/types";

const DEFAULT_PRIORITY_FILTER: NotificationPriority | "all" = "all";
const DEFAULT_ACTION_FILTER: AutomationAction | "all" = "all";

/**
 * The dedicated Automation Hub (`app/dashboard/automation/page.tsx`).
 *
 * V3-UX-001 — management-first, not activity-first. The page used to open
 * straight into a "log analytics" tile row and then an execution timeline
 * with no rule list anywhere on it, which meant "Automation" in the nav
 * only ever answered "what already happened?" This reorders it to answer
 * "what is running for me?" first: Your Automations (every real
 * `AutomationRule` from `useAutomationRules()`, always shown — a rule's
 * own `enabled` flag is independent of the master `AutomationPreferences`
 * switch, exactly like `AutomationPreferencesPage.tsx`'s own two-tier
 * toggle) comes right after the header, Recent Activity (the same
 * grouped/filtered execution log this page already had) is now clearly
 * secondary. No "Recommended Automations" section — no recommendation
 * data exists anywhere in `lib/automation/`, and the brief is explicit:
 * omit rather than fabricate.
 *
 * Still renders entirely from already-computed state — no fetching, no
 * rebuilding, never evaluating a rule itself. Search/priority/action
 * filters remain pure, component-local UI state, scoped to Recent Activity
 * only (they never affect Your Automations, which isn't filterable — it's
 * the fixed set of 5 rules the system ships with, per
 * `AutomationWidget.tsx`'s own "fixed/preset, togglable, not user-authored"
 * precedent).
 */
export function AutomationCenter() {
  const {
    automationResults: results,
    automationEnabled: enabled,
    hasAutomationResults,
    isPersonalized,
    activeWatchlist,
  } = usePersonalizedDashboard();
  const { results: rawResults } = useAutomation();
  const { rules, setEnabled: setRuleEnabled } = useAutomationRules();
  const metrics = useAutomationMetrics();
  const { isConnected } = useWallet();
  const walletAutomation = useWalletAutomation();
  const walletRuleStats = useMemo(() => buildAutomationRuleStats(walletAutomation.results), [walletAutomation.results]);
  // V4-FUTURE-001E (Phase 4) — the same real wallet-explain context
  // `RecentWalletEventsSection` already builds, reused here so
  // `AutomationItem`'s "Explain" button works identically wherever it
  // renders — never a second correlation/explanation pass.
  const { ai } = useWalletPortfolioAI();
  const { analytics } = useWalletAnalytics();
  const crossFeature = useCrossFeatureIntelligence();
  const chat = useAIChat();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<NotificationPriority | "all">(DEFAULT_PRIORITY_FILTER);
  const [action, setAction] = useState<AutomationAction | "all">(DEFAULT_ACTION_FILTER);

  const normalizedQuery = search.trim().toLowerCase();
  const criticalCount = useMemo(() => results.filter((result) => result.priority === "critical").length, [results]);

  // V4-AUTOMATION-001 (Phase 6) — the wallet's own activity, grouped with
  // the EXACT SAME `groupAutomationResults` (Today/Yesterday/Earlier)
  // "Recent Activity" already uses below, rather than a new grouping
  // scheme — the honest reason there's no single "Recent Improvements"/
  // "Recent Risks" split here: with 11 wallet rules now spanning both
  // directions (health can improve or decline, confidence/risk/fingerprint/
  // recommendation/top-warning changes are direction-neutral), a
  // title-sniffing split would be fragile where the existing, already-
  // correct date grouping is not.
  const walletGroups = useMemo(() => groupAutomationResults(walletAutomation.results), [walletAutomation.results]);

  // Your Automations' per-card "last run"/"trigger count" reads the SAME
  // raw, un-personalized result set the Metrics strip already used before
  // this redesign — a rule's own operational history describes the
  // rule/system, not "your current Watchlist."
  const ruleStats = useMemo(() => buildAutomationRuleStats(rawResults), [rawResults]);

  const filteredResults = useMemo(() => {
    const searched = filterAutomationResultsByQuery(results, normalizedQuery);
    const byPriority = filterAutomationResultsByPriority(searched, priority);
    return filterAutomationResultsByAction(byPriority, action);
  }, [results, normalizedQuery, priority, action]);

  const groups = useMemo(() => groupAutomationResults(filteredResults), [filteredResults]);

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className={PAGE_HEADER_TITLE_CLASS}>Automation</h1>
          <Link
            href="/dashboard/settings/automation"
            aria-label="Automation preferences"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            Preferences
          </Link>
        </div>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Automate Base Radar to monitor the ecosystem, analyze activity, and notify you automatically.
        </p>
      </div>

      <section aria-labelledby="automation-metrics-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <h2
            id="automation-metrics-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Metrics
          </h2>
        </div>
        <div className={cn("grid grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-4", GLASS_TILE_SURFACE)}>
          {metrics.map((metric) => (
            <AutomationMetric
              key={metric.key}
              label={metric.label}
              value={metric.isTimestamp ? <RelativeTime iso={String(metric.value)} /> : metric.value}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="your-automations-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <h2
            id="your-automations-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Your Automations
          </h2>
        </div>

        {!enabled && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            Automation is turned off — no rule can fire until you{" "}
            <Link
              href="/dashboard/settings/automation"
              className="font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
            >
              re-enable it
            </Link>
            , regardless of which rules below are individually enabled.
          </p>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <AutomationRuleCard
              key={rule.id}
              rule={rule}
              stats={getAutomationRuleStats(ruleStats, rule.id)}
              onToggle={(next) => setRuleEnabled(rule.id, next)}
            />
          ))}
        </ul>
      </section>

      {/*
        V3-WALLET-004 — wallet-specific rules, using the exact same
        `AutomationRuleCard`/`buildAutomationRuleStats` as "Your Automations"
        above, fed by `useWalletAutomation()` instead of the watchlist-based
        `useAutomation()`. Only shown when a wallet is connected — there is
        nothing honest to say about wallet rules for a disconnected user.
      */}
      {isConnected && (
        <section aria-labelledby="wallet-automations-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            <h2 id="wallet-automations-heading" className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              Wallet Automations
            </h2>
          </div>

          {!walletAutomation.automationEnabled ? (
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">
              Automation is turned off — wallet rules share the same master switch as every other rule above.
            </p>
          ) : walletAutomation.results.length === 0 && walletAutomation.rules.every((r) => !r.enabled) ? (
            <EmptyState icon={Wallet} title="All wallet rules are disabled." description="Enable a rule in Automation Preferences to start watching your portfolio." />
          ) : null}

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {walletAutomation.rules.map((rule) => (
              <AutomationRuleCard
                key={rule.id}
                rule={rule}
                stats={getAutomationRuleStats(walletRuleStats, rule.id)}
                onToggle={(next) => walletAutomation.setRuleEnabled(rule.id, next)}
              />
            ))}
          </ul>

          {/*
            V4-AUTOMATION-001 (Phase 6) — "Automation Health": a compact
            read on this evaluation pass itself (`walletAutomation.metadata`,
            Phase 9's own operational metadata — rule/event/result counts,
            never portfolio content), plus the wallet's own activity feed —
            confidence changes, fingerprint changes, health improvements/
            declines, and everything else the 11 wallet rules above cover —
            reusing `AutomationGroup`/`AutomationItem` verbatim, the exact
            same components "Recent Activity" below already renders.
          */}
          {walletAutomation.automationEnabled && walletAutomation.results.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-radar-light-muted dark:text-radar-muted">
                {walletAutomation.metadata.enabledRuleCount} of {walletAutomation.metadata.ruleCount} wallet rules enabled ·{" "}
                {walletAutomation.metadata.triggeredResultCount} triggered this session
                {walletAutomation.snapshot && (
                  <>
                    {" "}
                    · Confidence {walletAutomation.snapshot.confidenceScore}% ({walletAutomation.snapshot.confidenceLevel}) · Type {walletAutomation.snapshot.fingerprint}
                  </>
                )}
              </p>
              {AUTOMATION_GROUP_KEYS.map(
                (key) =>
                  walletGroups[key].length > 0 && (
                    <AutomationGroup key={key} id={`wallet-${key}`} title={AUTOMATION_GROUP_LABEL[key]}>
                      {walletGroups[key].map((result) => (
                        <AutomationItem key={result.id} result={result} compact crossFeature={crossFeature} ai={ai} analytics={analytics} onAskQuestion={chat.ask} />
                      ))}
                    </AutomationGroup>
                  )
              )}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="recent-activity-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <History className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <h2
            id="recent-activity-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Recent Activity
          </h2>
        </div>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>{buildAutomationSummary(results.length, criticalCount)}</p>

        {!enabled ? (
          <AutomationEmpty variant="disabled" className="py-16" />
        ) : !hasAutomationResults ? (
          <AutomationEmpty variant="none" className="py-16" />
        ) : isPersonalized && results.length === 0 ? (
          <AutomationEmpty variant="watchlist" watchlistName={activeWatchlist?.name} className="py-16" />
        ) : (
          <>
            <AutomationFilters
              search={search}
              onSearchChange={setSearch}
              priority={priority}
              onPriorityChange={setPriority}
              action={action}
              onActionChange={setAction}
            />

            {filteredResults.length === 0 ? (
              <AutomationEmpty variant={normalizedQuery !== "" ? "search" : "filter"} className="py-16" />
            ) : (
              AUTOMATION_GROUP_KEYS.map(
                (key) =>
                  groups[key].length > 0 && (
                    <AutomationGroup key={key} id={key} title={AUTOMATION_GROUP_LABEL[key]}>
                      {groups[key].map((result) => (
                        <AutomationItem key={result.id} result={result} crossFeature={crossFeature} ai={ai} analytics={analytics} onAskQuestion={chat.ask} />
                      ))}
                    </AutomationGroup>
                  )
              )
            )}
          </>
        )}
      </section>
    </div>
  );
}
