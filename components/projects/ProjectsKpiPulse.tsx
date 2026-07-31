/**
 * PR-057 — Task 4: the KPI Pulse row. Exactly the four metrics the brief
 * names — Total Projects, Verified, Newly Discovered, High Confidence —
 * every one a real count already computed by the page from
 * `getLiveProjects()`/`buildCollections()`. No metric is invented here.
 *
 * PR-059 — Task 4: typography/spacing prominence only — larger, bolder
 * values, roomier tiles. No new metric, no invented trend/delta, no color
 * change — every token used here already existed on this tile.
 */

import { formatNumber } from "@/lib/data/format";

type ProjectsKpiPulseProps = {
  totalProjects: number;
  verified: number;
  newlyDiscovered: number;
  highConfidence: number;
};

type Tile = { label: string; value: number };

export function ProjectsKpiPulse({ totalProjects, verified, newlyDiscovered, highConfidence }: ProjectsKpiPulseProps) {
  const tiles: Tile[] = [
    { label: "Total Projects", value: totalProjects },
    { label: "Verified", value: verified },
    { label: "Newly Discovered", value: newlyDiscovered },
    { label: "High Confidence", value: highConfidence },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex items-baseline justify-between gap-2 rounded-xl border border-radar-light-border bg-radar-light-card/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-radar-card/60"
        >
          <span className="truncate text-[11px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            {tile.label}
          </span>
          <span className="text-lg font-bold tracking-tight tabular-nums text-radar-light-text dark:text-radar-white">
            {formatNumber(tile.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
