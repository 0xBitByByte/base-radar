import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * PR-090.04 (Smart Collections) — one summary card for the index grid.
 * Every number shown is real: `matches.length`, `averageConfidence` (a
 * plain mean over real confidence values, `null` when there's nothing real
 * to average), and `lastEvaluatedAt` (the real moment this result was
 * computed — labeled "Evaluated," never "Live" or "Monitoring," since
 * nothing here runs without this page open).
 */
export function SmartCollectionCard({ result }: { result: SmartCollectionResult }) {
  const isUnavailable = result.status === "unavailable";
  const isChecking = result.status === "checking";

  return (
    <Link
      href={`/dashboard/collections/${result.id}`}
      className={cn("group flex flex-col gap-3 p-5 outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:border-radar-accent/30", GLASS_CARD_SURFACE)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{result.name}</h3>
        <ArrowRight className="size-4 shrink-0 text-radar-light-muted transition-transform group-hover:translate-x-0.5 dark:text-radar-muted" aria-hidden="true" />
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{result.description}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        {isUnavailable ? (
          <span className="flex items-center gap-1 font-medium text-radar-danger">
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            Can&apos;t evaluate right now
          </span>
        ) : isChecking ? (
          <span className="font-medium">Checking…</span>
        ) : (
          <>
            <span className="font-medium text-radar-light-text dark:text-radar-white">
              {result.matches.length} project{result.matches.length === 1 ? "" : "s"}
            </span>
            {result.averageConfidence !== null && <span>· {result.averageConfidence}% avg. confidence</span>}
            <span>
              · Evaluated <RelativeTime iso={result.lastEvaluatedAt} />
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
