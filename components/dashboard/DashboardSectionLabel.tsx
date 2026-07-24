type DashboardSectionLabelProps = {
  title: string;
  subtitle?: string;
};

/**
 * Visible section heading for the Dashboard's widget tiers (PR-048
 * requirement 14) — previously only a JSX comment separated these groups,
 * so users had no on-page way to tell "Your Intelligence" apart from
 * "Market Signals" or "Ecosystem Overview".
 */
export function DashboardSectionLabel({ title, subtitle }: DashboardSectionLabelProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:col-span-2 xl:col-span-3">
      <h2 className="text-sm font-semibold tracking-wide text-radar-light-text uppercase dark:text-radar-white">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">{subtitle}</p>
      )}
    </div>
  );
}
