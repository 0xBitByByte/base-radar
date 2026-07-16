import { BarChart3, Bell, Star } from "lucide-react";

const QUICK_ACTIONS = [
  { key: "watchlist", label: "Watchlist", icon: Star },
  { key: "alert", label: "Alert", icon: Bell },
  { key: "compare", label: "Compare", icon: BarChart3 },
] as const;

/**
 * PR11.1 Part 8 — UI-only placeholders for a later milestone, matching the
 * exact disabled-button idiom `QuickViewActions.tsx` already established
 * (`disabled` + `title` tooltip + `cursor-not-allowed`/`opacity-60`) rather
 * than inventing a second pattern for "not wired yet" actions.
 */
export function ProfileQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled
          title="Coming in a future milestone"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-muted opacity-60 dark:border-white/10 dark:text-radar-muted"
        >
          <action.icon className="size-3.5" aria-hidden="true" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
