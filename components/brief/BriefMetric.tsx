type BriefMetricProps = {
  label: string;
  value: string | number;
  align?: "start" | "end";
};

/**
 * One label/value stat tile — the same shape `ExecutiveSummary.tsx`'s
 * "Average Confidence"/"Highest Score" tiles already use, extracted here so
 * every Brief surface (`BriefCard`, `BriefWidget`, the Brief page's Market
 * Summary) renders metrics identically instead of three slightly different
 * copies.
 */
export function BriefMetric({ label, value, align = "start" }: BriefMetricProps) {
  return (
    <div className={`flex flex-col ${align === "end" ? "items-end" : "items-start"}`}>
      <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-lg font-semibold text-radar-light-text dark:text-radar-white">{value}</span>
    </div>
  );
}
