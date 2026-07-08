"use client";

type ClearFiltersButtonProps = {
  onClick: () => void;
};

/** Resets every active filter — never the search query — docs/explorer/03-screen-specifications.md §7. */
export function ClearFiltersButton({ onClick }: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-radar-light-muted underline-offset-2 outline-none transition-colors hover:text-radar-light-text hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
    >
      Clear filters
    </button>
  );
}
