import Link from "next/link";

const DISABLED_ACTIONS = [
  { key: "token", label: "View Token" },
  { key: "research", label: "Research" },
];

/**
 * `"View Token"`/`"Research"` stay placeholder-only — named future extension
 * seams for later milestones (a future token-data source; AI Research), not
 * wired to anything yet. `"Open Full Profile"` (PR11) is wired below to the
 * real Project Profile route now that it exists.
 */
export function QuickViewActions({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap gap-2 px-5 py-4">
      <Link
        href={`/dashboard/projects/${slug}`}
        className="rounded-lg border border-radar-light-border px-3 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
      >
        Open Full Profile →
      </Link>
      {DISABLED_ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled
          title="Coming in a future milestone"
          className="cursor-not-allowed rounded-lg border border-radar-light-border px-3 py-2 text-xs font-medium text-radar-light-muted opacity-60 dark:border-white/10 dark:text-radar-muted"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
