"use client";

import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { formatCompactCurrency, formatPercent } from "@/lib/data/format";
import type { LiveProject } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

/**
 * PR-091.06 (Visual Compare) — three chart primitives layered on top of the
 * existing comparison table, every one reading fields `CompareView` already
 * renders as plain text (`market.tvlUsd`/`marketCapUsd`/`volume24hUsd`,
 * `health.score`, `confidence.score`, `engineering.stars`, `riskLevel`,
 * `market.changePct24h`/`changePct7d`). No new metric, no new score — this
 * file only re-presents real numbers visually. `recharts` is already an app
 * dependency (`components/explorer/ProfileChart.tsx`), reused here rather
 * than adding a new charting library.
 */

const SERIES_COLORS = ["var(--color-radar-primary)", "var(--color-radar-accent)", "var(--color-radar-purple)", "var(--color-radar-orange)"];

/** Ordinal risk → a 0-100 "safety" axis for the radar chart only — a chart-encoding of the existing 4-value `RiskLevel` vocabulary, never a new risk score. Labeled on-screen so this is never mistaken for a 5th real metric. */
const RISK_SAFETY: Record<string, number> = { low: 100, moderate: 66, elevated: 33, high: 0 };

function shortName(name: string): string {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

type MetricBarChartProps = {
  title: string;
  compared: LiveProject[];
  value: (project: LiveProject) => number | null;
  format: (value: number) => string;
};

function MetricBarChart({ title, compared, value, format }: MetricBarChartProps) {
  const data = compared.map((project, index) => ({
    name: shortName(project.identity.name),
    value: value(project),
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }));
  if (data.every((row) => row.value === null)) return null;

  const chartTitle = `${title} comparison`;
  const chartDesc = `Bar chart comparing ${title} across ${compared.map((project) => project.identity.name).join(", ")}. The same values are also shown as plain text in the comparison table above.`;

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl p-3", GLASS_SURFACE_STATIC)}>
      <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">{title}</span>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title={chartTitle} desc={chartDesc}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-radar-light-border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-radar-muted)" }} axisLine={false} tickLine={false} />
            <YAxis width={48} tick={{ fontSize: 10, fill: "var(--color-radar-muted)" }} tickFormatter={format} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => format(Number(value))}
              contentStyle={{ background: "var(--color-radar-light-card)", border: "1px solid var(--color-radar-light-border)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function IntelligenceRadar({ compared }: { compared: LiveProject[] }) {
  const axes: { key: string; label: string; value: (p: LiveProject) => number | null }[] = [
    { key: "health", label: "Health", value: (p) => p.health?.score ?? null },
    { key: "confidence", label: "Confidence", value: (p) => p.confidence.score },
    { key: "safety", label: "Risk Safety", value: (p) => (p.riskLevel ? RISK_SAFETY[p.riskLevel] ?? null : null) },
    {
      key: "engineering",
      label: "Dev Activity",
      value: (p) => {
        const maxStars = Math.max(0, ...compared.map((c) => c.engineering.stars ?? 0));
        return p.engineering.stars !== null && maxStars > 0 ? Math.round((p.engineering.stars / maxStars) * 100) : null;
      },
    },
  ];

  const usableAxes = axes.filter((axis) => compared.some((p) => axis.value(p) !== null));
  if (usableAxes.length < 3) return null;

  const data = usableAxes.map((axis) => {
    const row: Record<string, string | number> = { metric: axis.label };
    compared.forEach((project) => {
      row[project.id] = axis.value(project) ?? 0;
    });
    return row;
  });

  const chartDesc = `Radar chart comparing ${usableAxes.map((axis) => axis.label).join(", ")} across ${compared.map((project) => project.identity.name).join(", ")}, each on a 0 to 100 scale.`;

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl p-3", GLASS_SURFACE_STATIC)}>
      <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
        Intelligence Radar — Health / Confidence / Risk Safety / Dev Activity, 0–100
      </span>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} title="Intelligence Radar comparison" desc={chartDesc}>
            <PolarGrid stroke="var(--color-radar-light-border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-radar-muted)" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--color-radar-muted)" }} axisLine={false} />
            {compared.map((project, index) => (
              <Radar
                key={project.id}
                name={project.identity.name}
                dataKey={project.id}
                stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                fillOpacity={0.15}
                isAnimationActive={false}
              />
            ))}
            <Tooltip contentStyle={{ background: "var(--color-radar-light-card)", border: "1px solid var(--color-radar-light-border)", borderRadius: 8, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {compared.map((project, index) => (
          <span key={project.id} className="flex items-center gap-1.5 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
            <span className="size-2 shrink-0 rounded-full" style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} aria-hidden="true" />
            {project.identity.name}
          </span>
        ))}
      </div>
    </div>
  );
}

type HeatmapRow = { label: string; format: (value: number) => string; value: (p: LiveProject) => number | null };

const HEATMAP_ROWS: HeatmapRow[] = [
  { label: "24h Change", format: (v) => formatPercent(v, { showSign: true }), value: (p) => p.market.changePct24h },
  { label: "7d Change", format: (v) => formatPercent(v, { showSign: true }), value: (p) => p.market.changePct7d },
  { label: "Health", format: (v) => `${v}/100`, value: (p) => p.health?.score ?? null },
  { label: "Confidence", format: (v) => `${v}/100`, value: (p) => p.confidence.score },
  { label: "Market Cap", format: (v) => formatCompactCurrency(v), value: (p) => p.market.marketCapUsd },
  { label: "TVL", format: (v) => formatCompactCurrency(v), value: (p) => p.market.tvlUsd },
];

/** Green the higher a real value ranks among the compared set, transparent when it isn't the best or worst — a relative-rank visualization of numbers already shown as plain text elsewhere, never a new computed score. */
function heatCellStyle(value: number | null, allValues: (number | null)[]): { background: string } {
  const real = allValues.filter((v): v is number => v !== null);
  if (value === null || real.length < 2) return { background: "transparent" };
  const min = Math.min(...real);
  const max = Math.max(...real);
  if (min === max) return { background: "transparent" };
  const ratio = (value - min) / (max - min);
  return { background: `rgba(24, 199, 139, ${(ratio * 0.35).toFixed(2)})` };
}

function CompareHeatmap({ compared }: { compared: LiveProject[] }) {
  const rows = HEATMAP_ROWS.filter((row) => compared.some((p) => row.value(p) !== null));
  if (rows.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2 overflow-x-auto rounded-xl p-3", GLASS_SURFACE_STATIC)}>
      <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
        Heatmap — greener is relatively stronger among these {compared.length} projects
      </span>
      <table className="w-full min-w-[420px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left font-medium text-radar-light-muted dark:text-radar-muted" />
            {compared.map((project) => (
              <th key={project.id} scope="col" className="p-2 text-left font-medium text-radar-light-text dark:text-radar-white">
                {shortName(project.identity.name)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const values = compared.map((p) => row.value(p));
            return (
              <tr key={row.label} className="border-t border-radar-light-border dark:border-white/10">
                <th scope="row" className="p-2 text-left font-medium text-radar-light-muted dark:text-radar-muted">
                  {row.label}
                </th>
                {compared.map((project, index) => {
                  const value = values[index];
                  return (
                    <td key={project.id} className="p-2 text-radar-light-text dark:text-radar-white" style={heatCellStyle(value, values)}>
                      {value === null ? "Not Tracked" : row.format(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CompareCharts({ compared }: { compared: LiveProject[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Visual Compare</h2>
        <p className="text-xs text-radar-light-muted dark:text-radar-muted">Real values only — a metric with no real data for any compared project is never charted.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricBarChart title="TVL" compared={compared} value={(p) => p.market.tvlUsd} format={formatCompactCurrency} />
        <MetricBarChart title="Market Cap" compared={compared} value={(p) => p.market.marketCapUsd} format={formatCompactCurrency} />
        <MetricBarChart title="24h Volume" compared={compared} value={(p) => p.market.volume24hUsd} format={formatCompactCurrency} />
      </div>
      <IntelligenceRadar compared={compared} />
      <CompareHeatmap compared={compared} />
    </div>
  );
}
