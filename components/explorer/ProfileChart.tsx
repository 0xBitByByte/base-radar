"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompactCurrency, formatPrice } from "@/lib/data/format";
import type { SparklinePoint } from "@/lib/data/types";

type ProfileChartProps = {
  data: SparklinePoint[];
  /**
   * Which formatter to apply to `v` for the axis/tooltip — a string key
   * rather than a function prop, since `ProfileMetrics` (the caller) is a
   * Server Component and this is a Client Component: a plain function
   * can't cross that boundary as a prop, so the actual formatter is
   * resolved here instead.
   */
  variant?: "price" | "currency";
  color?: string;
  height?: number;
  className?: string;
};

const FORMATTERS: Record<NonNullable<ProfileChartProps["variant"]>, (value: number) => string> = {
  price: formatPrice,
  currency: formatCompactCurrency,
};

function ChartTooltip({
  active,
  payload,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-radar-light-border bg-radar-light-card px-2.5 py-1.5 text-xs font-medium text-radar-light-text shadow-lg dark:border-white/10 dark:bg-radar-card dark:text-radar-white">
      {formatValue(payload[0].value)}
    </div>
  );
}

/**
 * A larger, axis-bearing sibling of `Sparkline` (PR11) — same `recharts`
 * library and gradient-area recipe, just with real axes/tooltip for a
 * dedicated chart section instead of an inline metric accent. `Sparkline`
 * itself is untouched; `KPIRow`/`PortfolioWidget` keep using it exactly as
 * before.
 */
export function ProfileChart({
  data,
  variant = "currency",
  color = "var(--color-radar-primary)",
  height = 220,
  className,
}: ProfileChartProps) {
  const gradientId = `profile-chart-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  const formatValue = FORMATTERS[variant];

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis
            domain={["dataMin", "dataMax"]}
            width={56}
            tick={{ fontSize: 10, fill: "var(--color-radar-muted)" }}
            tickFormatter={formatValue}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
