import { Timestamp } from "@/components/explorer/Timestamp";
import { cn } from "@/lib/utils";
import type { Freshness } from "@/lib/intelligence/types";

type ProjectCardFooterProps = {
  freshness: Freshness;
  className?: string;
};

/**
 * Freshness only — never Sources. Full per-provider attribution is
 * Quick-View-only (docs/explorer/03 §14 item 8 / 05 §12); this PR's
 * approved scope explicitly excludes it from the card.
 */
export function ProjectCardFooter({ freshness, className }: ProjectCardFooterProps) {
  return (
    <div className={cn("text-[10.5px] text-radar-light-muted dark:text-radar-muted", className)}>
      <Timestamp iso={freshness.newestSourceAt} fallback="No live data yet" />
    </div>
  );
}
