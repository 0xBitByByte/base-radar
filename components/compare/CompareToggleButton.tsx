"use client";

import { GitCompare } from "lucide-react";

import { useCompare } from "@/lib/hooks/useCompare";
import { MAX_COMPARE_PROJECTS } from "@/lib/compare/types";
import { cn } from "@/lib/utils";

type CompareToggleButtonProps = {
  projectId: string;
  projectName: string;
  className?: string;
};

/**
 * PR-091 (Compare Platform) — replaces the disabled "Compare" placeholder
 * `ProfileQuickActions.tsx` shipped in PR-079. Same visual idiom as that
 * file's own real Watchlist toggle button (active/inactive states, not a
 * new pattern) — add/remove this project from the local-device Compare
 * list via `useCompare()`. Disabled (not hidden) once the list is full and
 * this project isn't already in it, so the control's position never shifts
 * and the reason is stated in its own `title`, matching the disabled-button
 * idiom this file's other placeholders already use.
 */
export function CompareToggleButton({ projectId, projectName, className }: CompareToggleButtonProps) {
  const { isComparing, isFull, toggle } = useCompare();
  const comparing = isComparing(projectId);
  const disabled = isFull && !comparing;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={comparing}
      aria-label={comparing ? `Remove ${projectName} from Compare` : `Add ${projectName} to Compare`}
      title={disabled ? `Compare list is full (${MAX_COMPARE_PROJECTS}/${MAX_COMPARE_PROJECTS}) — remove a project first.` : undefined}
      onClick={() => toggle(projectId)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
        disabled
          ? "cursor-not-allowed border-radar-light-border text-radar-light-muted opacity-60 dark:border-white/10 dark:text-radar-muted"
          : comparing
            ? "cursor-pointer border-radar-primary/30 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/30 dark:bg-radar-accent/10 dark:text-radar-accent"
            : "cursor-pointer border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5",
        className
      )}
    >
      <GitCompare className="size-3.5" aria-hidden="true" />
      {comparing ? "Comparing" : "Compare"}
    </button>
  );
}
