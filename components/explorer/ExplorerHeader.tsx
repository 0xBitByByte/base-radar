import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatRelativeTime } from "@/lib/data/format";
import type { RegistryMetrics } from "@/data/projects/metrics";

type ExplorerHeaderProps = {
  /** The currently visible (search-filtered) project count — docs/explorer/03 §3, priority 2. */
  visibleCount: number;
  /** The Intelligence Engine batch's `metadata.generatedAt` — docs/explorer/03 §3, priority 5. */
  generatedAt: string;
  /**
   * PR-038 — real, computed registry counts (`computeRegistryMetrics`).
   * Per explicit product direction: no fallback/inference logic. Each chip
   * below only renders once its count is genuinely nonzero, so this whole
   * row is invisible today (no seed project has `verificationLevel`/
   * `lifecycle` data yet) and will activate automatically, chip by chip,
   * as registry metadata is populated in a future PR — never before.
   */
  registryMetrics: RegistryMetrics;
};

export function ExplorerHeader({ visibleCount, generatedAt, registryMetrics }: ExplorerHeaderProps) {
  const chips: Array<{ key: string; label: string }> = [
    { key: "verified", label: `${registryMetrics.verified} Verified` },
    { key: "intelligenceReady", label: `${registryMetrics.intelligenceReady} Intelligence Ready` },
    { key: "newThisMonth", label: `${registryMetrics.newThisMonth} New This Month` },
    { key: "updatedToday", label: `${registryMetrics.updatedToday} Updated Today` },
  ].filter((chip) => registryMetrics[chip.key as keyof RegistryMetrics] > 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text sm:text-3xl dark:text-radar-white">
        Base Ecosystem Projects
      </h1>
      <p className="mt-1.5 text-sm text-radar-light-muted sm:text-base dark:text-radar-muted">
        Browse every project in the Base Radar Project Registry.
      </p>
      <p
        className="mt-2 text-xs text-radar-light-muted dark:text-radar-muted"
        aria-live="polite"
      >
        Showing {visibleCount} {visibleCount === 1 ? "Project" : "Projects"} · Updated{" "}
        {formatRelativeTime(generatedAt)}
      </p>
      {/* Activates automatically once registry metadata (lifecycle/verificationLevel) is populated in a future PR — no chip renders on fabricated or zero data. */}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <GlowBadge key={chip.key} color="muted">
              {chip.label}
            </GlowBadge>
          ))}
        </div>
      )}
    </div>
  );
}
