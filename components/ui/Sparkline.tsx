"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import type { SparklinePoint } from "@/lib/data/types";

type SparklineProps = {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  className?: string;
};

export function Sparkline({ data, color = "#0052ff", height = 40, className }: SparklineProps) {
  const gradientId = `sparkline-${color.replace("#", "")}`;

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
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
