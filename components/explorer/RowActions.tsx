type RowActionsProps = {
  /** No-op until Quick View exists (Milestone 7, PR6) — docs/explorer/06 §4. */
  onActivate?: () => void;
};

/**
 * The one explicit, focusable "View" control per row — necessary so
 * keyboard and screen-reader users have a discoverable way to open Quick
 * View without relying on "click anywhere on the row" (docs/explorer/04
 * §10). `stopPropagation` keeps this from also firing the row's own click
 * handler once both exist.
 */
export function RowActions({ onActivate }: RowActionsProps) {
  return (
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
  );
}
