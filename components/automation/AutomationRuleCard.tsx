"use client";

import { Switch } from "@base-ui/react/switch";

import { AutomationActionBadge, AutomationTriggerBadge } from "@/components/automation/AutomationBadge";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { cn } from "@/lib/utils";
import type { AutomationRule } from "@/lib/automation/types";
import type { AutomationRuleStats } from "@/components/automation/ruleStats";

const SWITCH_ROOT_CLASS =
  "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:bg-white/10 dark:data-[checked]:bg-radar-primary";
const SWITCH_THUMB_CLASS =
  "block size-3.5 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-[18px] dark:bg-radar-bg";

type AutomationRuleCardProps = {
  rule: AutomationRule;
  stats: AutomationRuleStats;
  onToggle: (enabled: boolean) => void;
};

/**
 * One automation "agent" — name, purpose, status, trigger, and last real
 * execution, plus the one real management action this system supports:
 * enable/disable (`lib/automation/rules.ts`'s `setRuleEnabled`, the same
 * mutator `AutomationPreferencesPage.tsx` already uses). No "Run now" (no
 * manual-execution capability exists — actions are data only, per
 * `lib/automation/types.ts`'s own doc comment), no "Edit" (rule *logic* is
 * read-only by design, per the same file — only `enabled` is
 * user-configurable), no "Schedule"/"Next Run" (rules trigger on
 * notification events, there's no cron/schedule concept anywhere in this
 * system). Every field shown here is a real, existing property of
 * `AutomationRule` or a pure derivation of `AutomationResult[]`
 * (`ruleStats.ts`) — nothing here is invented.
 */
export function AutomationRuleCard({ rule, stats, onToggle }: AutomationRuleCardProps) {
  return (
    <li className={cn("flex flex-col gap-3 p-4", GLASS_TILE_SURFACE)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">
              {rule.name}
            </span>
            <span
              className={cn(
                "inline-flex w-fit shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold",
                rule.enabled
                  ? "border-radar-success/30 bg-radar-success/10 text-radar-success"
                  : "border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted"
              )}
            >
              {rule.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{rule.description}</p>
        </div>

        <Switch.Root
          checked={rule.enabled}
          onCheckedChange={onToggle}
          aria-label={`${rule.enabled ? "Disable" : "Enable"} the "${rule.name}" automation`}
          className={SWITCH_ROOT_CLASS}
        >
          <Switch.Thumb className={SWITCH_THUMB_CLASS} />
        </Switch.Root>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <AutomationTriggerBadge trigger={rule.trigger} />
        {rule.actions.map((action) => (
          <AutomationActionBadge key={action} action={action} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-radar-light-border pt-2.5 text-[10.5px] text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        <span>{stats.triggerCount > 0 ? `${stats.triggerCount} trigger${stats.triggerCount === 1 ? "" : "s"}` : "Never triggered"}</span>
        {stats.lastTriggeredAt && (
          <span>
            Last run <RelativeTime iso={stats.lastTriggeredAt} />
          </span>
        )}
      </div>
    </li>
  );
}
