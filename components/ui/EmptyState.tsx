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

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-radar-light-border px-6 py-10 text-center dark:border-white/10",
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-radar-light-surface text-radar-light-muted dark:bg-white/5 dark:text-radar-muted">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{title}</p>
        {description && (
          <p className="max-w-xs text-xs text-radar-light-muted dark:text-radar-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
