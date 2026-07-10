"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SparklinePoint } from "@/lib/data/types";

type SparklineProps = {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  /** Stroke opacity — defaults to fully opaque so every existing consumer's appearance is unchanged unless it explicitly opts into a softer line (the Dashboard KPI Row passes `0.8` so the sparkline reads as supporting context next to the hero value, not competing with it). */
  opacity?: number;
  className?: string;
};

export function Sparkline({
  data,
  color = "var(--color-radar-primary)",
  height = 40,
  opacity = 1,
  className,
}: SparklineProps) {
  // Strips every non-alphanumeric character rather than just "#" — the
  // default color is now a CSS custom-property reference
  // (`var(--color-radar-primary)`), and its parentheses/dashes would
  // otherwise produce an invalid `url(#...)` gradient reference.
  const gradientId = `sparkline-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
