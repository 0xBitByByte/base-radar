import Link from "next/link";

import { AutomationActionBadge, AutomationTriggerBadge } from "@/components/automation/AutomationBadge";
import { getResultActions, getResultTrigger } from "@/components/automation/filters";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { formatRelativeTime } from "@/lib/data/format";
import type { AutomationResult } from "@/lib/automation/types";

type AutomationItemProps = {
  result: AutomationResult;
  /** Trims the row for compact previews — no summary line. */
  compact?: boolean;
};

/**
 * One Automation entry. `result.link` is already a real, precomputed
 * route (carried over unchanged from the notification that triggered this
 * rule) — this component never derives a link itself, so an aggregate
 * result with no real destination simply renders without the
 * stretched-link wrapper, never a broken one. The Priority badge reuses
 * `NotificationBadge` directly (`AutomationResult.priority` is the exact
 * same `NotificationPriority` union) rather than a second priority chip.
 */
export function AutomationItem({ result, compact = false }: AutomationItemProps) {
  const trigger = getResultTrigger(result);
  const actions = getResultActions(result);

  return (
    <li className="group relative flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-card p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
      {result.link && (
        <Link
          href={result.link}
          aria-label={`${result.title}${result.projectName ? `. View ${result.projectName}'s Project Profile.` : ". View details."}`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {trigger && <AutomationTriggerBadge trigger={trigger} />}
          {result.projectName && (
            <span className="max-w-[160px] truncate text-[10.5px] font-medium text-radar-light-text dark:text-radar-white">
              {result.projectName}
            </span>
          )}
          <NotificationBadge priority={result.priority} />
        </div>

        <time
          dateTime={result.triggeredAt}
          className="shrink-0 text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted"
        >
          {formatRelativeTime(result.triggeredAt)}
        </time>
      </div>

      <div className="relative z-[1] flex flex-col gap-1">
        <p className="line-clamp-1 text-sm font-semibold text-radar-light-text dark:text-radar-white">{result.title}</p>
        {!compact && (
          <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
            {result.summary}
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="relative z-[1] flex flex-wrap items-center gap-1.5">
          {actions.map((action) => (
            <AutomationActionBadge key={action} action={action} />
          ))}
        </div>
      )}
    </li>
  );
}
