import { WatchButton } from "@/components/watchlist/WatchButton";

type RowActionsProps = {
  projectId: string;
  projectName: string;
  /** Opens this row's project Profile page (PR13.5 — the Quick View drawer this used to open has been removed). */
  onActivate?: () => void;
};

/**
 * The per-row action cluster — Watch (PR13.1) plus the one explicit,
 * focusable "View" control, necessary so keyboard and screen-reader users
 * have a discoverable way to open the Profile page without relying on
 * "click anywhere on the row" (docs/explorer/04 §10). `stopPropagation` on
 * "View" keeps it from also firing the row's own click handler once both
 * exist — `WatchButton` already does the same internally.
 */
export function RowActions({ projectId, projectName, onActivate }: RowActionsProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      <WatchButton projectId={projectId} projectName={projectName} size="sm" />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onActivate?.();
        }}
        className="rounded-lg border border-radar-light-border px-2.5 py-1 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
      >
        View
      </button>
    </div>
  );
}
