type NotificationMetricProps = {
  label: string;
  value: string | number;
  align?: "start" | "end";
};

/**
 * One label/value stat tile — the same shape `TimelineMetric`/
 * `BriefMetric`/`PortfolioMetric` already use, kept as its own component
 * here matching this codebase's one-component-per-feature-area convention.
 */
export function NotificationMetric({ label, value, align = "start" }: NotificationMetricProps) {
  return (
    <div className={`flex flex-col ${align === "end" ? "items-end" : "items-start"}`}>
      <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
    </div>
  );
}
