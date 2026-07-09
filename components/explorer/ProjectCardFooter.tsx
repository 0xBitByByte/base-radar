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
 * approved scope explicitly excludes it from the card. Opacity-muted at
 * the same weight as `WidgetCard`'s own `lastUpdated` footer treatment —
 * reused rather than reinvented.
 */
export function ProjectCardFooter({ freshness, className }: ProjectCardFooterProps) {
  return (
    <div className={cn("text-[10.5px] text-radar-light-muted/70 dark:text-radar-muted/50", className)}>
      <Timestamp iso={freshness.newestSourceAt} fallback="No live data yet" />
    </div>
  );
}
