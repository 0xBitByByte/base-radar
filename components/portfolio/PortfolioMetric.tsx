type PortfolioMetricProps = {
  label: string;
  value: string | number;
  align?: "start" | "end";
};

/**
 * One label/value stat tile — the same shape `components/brief/
 * BriefMetric.tsx` already uses, kept as its own component here (rather
 * than importing Brief's) so Portfolio's UI has no dependency on the
 * Brief feature's file tree, matching this codebase's one-component-per-
 * feature-area convention.
 */
export function PortfolioMetric({ label, value, align = "start" }: PortfolioMetricProps) {
  return (
    <div className={`flex flex-col ${align === "end" ? "items-end" : "items-start"}`}>
      <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
    </div>
  );
}
