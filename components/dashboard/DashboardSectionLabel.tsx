type DashboardSectionLabelProps = {
  title: string;
  subtitle?: string;
};

/**
 * Visible section heading for the Dashboard's widget tiers (PR-048
 * requirement 14) — previously only a JSX comment separated these groups,
 * so users had no on-page way to tell "Your Intelligence" apart from
 * "Market Signals" or "Ecosystem Overview".
 *
 * V2-UX-003 — measured live (computed styles): this heading and every
 * individual widget's own `WidgetCard` title rendered at the identical
 * 14px/600 weight, differentiated only by uppercase — a tier-level grouping
 * label read at the same visual weight as the widgets it contains, a
 * textbook "competing headings" case. Restyled as a true structural
 * eyebrow label instead: smaller, muted, wider tracking — the exact
 * existing micro-label convention this codebase already uses elsewhere for
 * "this is a small structural label, not primary content"
 * (`ExecutiveSummaryStrip`'s "TODAY'S HIGHLIGHTS", `WatchlistCollectionCard`'s
 * "N PROJECTS") — not a new pattern. Subtitle untouched.
 */
export function DashboardSectionLabel({ title, subtitle }: DashboardSectionLabelProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:col-span-2 xl:col-span-3">
      <h2 className="text-[11px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">{subtitle}</p>
      )}
    </div>
  );
}
