"use client";

import { RotateCcw, Zap } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { AutomationActionBadge, AutomationTriggerBadge } from "@/components/automation/AutomationBadge";
import { useAutomationPreferences } from "@/lib/hooks/useAutomationPreferences";
import { useAutomationRules } from "@/lib/hooks/useAutomationRules";

const SWITCH_ROOT_CLASS =
  "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg";
const SWITCH_THUMB_CLASS =
  "block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6 dark:bg-radar-bg";

/**
 * `/dashboard/settings/automation` — the same card/section chrome
 * `NotificationPreferencesPage.tsx` established for
 * `/dashboard/settings/notifications` (no existing `/dashboard/settings`
 * index page to inherit a "settings design language" from, so both pages
 * follow the rest of the dashboard's own borders/rounded-corners/spacing
 * rhythm). The toggle switch reuses `@base-ui/react/switch`, the same
 * primitive `ThemeToggle`/`NotificationPreferencesPage` already use.
 *
 * Rule *logic* (trigger/conditions/actions) is read-only here by design —
 * only each rule's `enabled` flag is user-configurable, per the PR
 * brief's "Do NOT allow editing rule logic."
 */
export function AutomationPreferencesPage() {
  const { preferences, setEnabled: setAutomationEnabled } = useAutomationPreferences();
  const { rules, setEnabled: setRuleEnabled, reset } = useAutomationRules();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Automation Preferences</h1>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          Turn the Automation System on or off, and choose which rules are allowed to fire.
        </p>
      </div>

      <section aria-labelledby="automation-preferences-master-heading" className="flex flex-col gap-3">
        <h2
          id="automation-preferences-master-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Automation System
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-radar-light-text dark:text-radar-white">
            <Zap className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
            Automation Enabled
          </span>
          <Switch.Root
            checked={preferences.enabled}
            onCheckedChange={(checked) => setAutomationEnabled(checked)}
            aria-label={preferences.enabled ? "Disable automation" : "Enable automation"}
            className={SWITCH_ROOT_CLASS}
          >
            <Switch.Thumb className={SWITCH_THUMB_CLASS} />
          </Switch.Root>
        </div>
        {!preferences.enabled && (
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">
            No rule can fire while Automation is disabled — the Dashboard widget and Automation page will both show no
            results, regardless of which rules below are individually enabled.
          </p>
        )}
      </section>

      <section aria-labelledby="automation-preferences-rules-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="automation-preferences-rules-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Rules
          </h2>
          <button
            type="button"
            onClick={() => reset()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset all rules to defaults
          </button>
        </div>
        <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border bg-radar-light-card dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <AutomationTriggerBadge trigger={rule.trigger} />
                  <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">
                    {rule.name}
                  </span>
                </div>
                <Switch.Root
                  checked={rule.enabled}
                  onCheckedChange={(checked) => setRuleEnabled(rule.id, checked)}
                  aria-label={`${rule.enabled ? "Disable" : "Enable"} the "${rule.name}" rule`}
                  className={SWITCH_ROOT_CLASS}
                >
                  <Switch.Thumb className={SWITCH_THUMB_CLASS} />
                </Switch.Root>
              </div>
              <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{rule.description}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {rule.actions.map((action) => (
                  <AutomationActionBadge key={action} action={action} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
