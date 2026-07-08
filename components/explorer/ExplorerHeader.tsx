import { formatRelativeTime } from "@/lib/data/format";

type ExplorerHeaderProps = {
  /** The currently visible (search-filtered) project count — docs/explorer/03 §3, priority 2. */
  visibleCount: number;
  /** The Intelligence Engine batch's `metadata.generatedAt` — docs/explorer/03 §3, priority 5. */
  generatedAt: string;
};

export function ExplorerHeader({ visibleCount, generatedAt }: ExplorerHeaderProps) {
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
        {visibleCount} {visibleCount === 1 ? "project" : "projects"} · Last updated{" "}
        {formatRelativeTime(generatedAt)}
      </p>
    </div>
  );
}
