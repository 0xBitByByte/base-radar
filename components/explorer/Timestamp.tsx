import { Tooltip } from "@/components/ui/Tooltip";
import { formatRelativeTime } from "@/lib/data/format";

type TimestampProps = {
  iso: string | null;
  fallback?: string;
  className?: string;
};

/**
 * Relative time, with the exact absolute timestamp revealed on hover —
 * docs/explorer/03-screen-specifications.md §12. Presentation only: never
 * computes Freshness itself, only displays a timestamp it's given. `iso`
 * is `null` when a project has no live source at all, in which case the
 * honest `fallback` renders instead of a fabricated time.
 */
export function Timestamp({ iso, fallback = "No live data yet", className }: TimestampProps) {
  if (!iso) {
    return <span className={className}>{fallback}</span>;
  }

  const exact = new Date(iso).toLocaleString();

  return (
    <Tooltip content={exact}>
      <span className={className}>Updated {formatRelativeTime(iso)}</span>
    </Tooltip>
  );
}
