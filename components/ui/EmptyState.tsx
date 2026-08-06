import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * PR-074 — this is the one shared empty-state card every section on the
 * Project Profile page (and several others) renders when it has genuinely
 * nothing real to show. `py-10` plus a narrow `max-w-xs` description meant
 * that any of this codebase's longer, honestly-detailed explanations (e.g.
 * the Timeline's "No releases, commits, whale transfers, governance
 * proposals..." sentence) wrapped across many lines, making an empty card
 * visually dominate — sometimes nearly a full viewport — rather than reading
 * as a quiet, compact "nothing here yet" notice. Tightened padding and a
 * wider description column fix this once, for every section that uses it,
 * instead of patching each empty-state call site individually.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-radar-light-border px-6 py-6 text-center dark:border-white/10",
        className
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-radar-light-surface text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
