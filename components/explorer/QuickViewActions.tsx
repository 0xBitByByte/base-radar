const ACTIONS = [
  { key: "profile", label: "Open Full Profile" },
  { key: "token", label: "View Token" },
  { key: "research", label: "Research" },
];

/**
 * Placeholder actions only — no navigation exists yet. Each is the named
 * future extension seam for a later milestone ("View full details" /
 * Project Details, Milestone 10; "View Token", tied to a future token-data
 * source; "Research", AI Research, Milestone 10) — visibly present so the
 * drawer's eventual shape is legible now, but disabled rather than wired to
 * anything.
 */
export function QuickViewActions() {
  return (
    <div className="flex flex-wrap gap-2 px-5 py-4">
      {ACTIONS.map((action) => (
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
