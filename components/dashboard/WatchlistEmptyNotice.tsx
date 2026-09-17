import type { LucideIcon } from "lucide-react";

/**
 * UX Polish, Phase 7 — a single, minimal empty-state row for the specific
 * "this widget is empty because the active Watchlist has no projects yet"
 * case, replacing the full `EmptyState` (icon-in-circle + heading + a
 * paragraph of description) previously repeated near-verbatim across 5
 * widgets (`AIIntelligenceWidget`, `BriefWidget`,
 * `components/portfolio/PortfolioWidget.tsx`, `WatchlistWidget`,
 * `NotificationWidget`'s first branch) — confirmed via audit: 7 of 8
 * dashboard widgets shared byte-identical `EmptyState` markup with a
 * near-verbatim "[Noun] yet." title and, in 3 cases, an identical
 * `ManageWatchlistAction` CTA.
 *
 * Does NOT remove any widget or replace the fuller `EmptyState` everywhere
 * — only for this one specific, genuinely repetitive cause. A widget's
 * OTHER empty states (e.g. `NotificationWidget`'s "All quiet for now" once
 * a Watchlist exists but nothing's happened yet) are a different, real
 * condition and keep the full `EmptyState` treatment, since only one of
 * them is ever the redundant "go add a project" message at a time.
 * `GettingStartedCard` (rendered once, above this tier, for exactly this
 * same "no Watchlist yet" state) already carries the full explanation and
 * the checklist context — this stays a one-line pointer back to it/the
 * Watchlist page, not a second full explanation.
 */
export function WatchlistEmptyNotice({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <p className="flex items-center gap-2 py-2 text-xs text-radar-light-muted dark:text-radar-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label} once you add a project to your Watchlist.
    </p>
  );
}
