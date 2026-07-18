import { NARRATIVE_BADGE_CLASS, NARRATIVE_EMOJI, NARRATIVE_ICON, NARRATIVE_LABEL } from "@/components/alerts/meta";
import type { NarrativeType } from "@/lib/alerts/intelligence/types";
import { cn } from "@/lib/utils";

type NarrativeBadgeProps = {
  narrative: NarrativeType;
  className?: string;
};

/**
 * The Intelligence Card's headline chip — same shape as `SeverityBadge`
 * (icon + label + semantic color, reused from `components/alerts/meta.ts`),
 * plus the narrative's emoji per the PR brief's own example ("🚀 Growth
 * Opportunity"). Reuses `SeverityBadge`'s exact class shape rather than a
 * new one, per "reuse existing badge styles."
 */
export function NarrativeBadge({ narrative, className }: NarrativeBadgeProps) {
  const Icon = NARRATIVE_ICON[narrative];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        NARRATIVE_BADGE_CLASS[narrative],
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{NARRATIVE_EMOJI[narrative]}</span>
      {NARRATIVE_LABEL[narrative]}
    </span>
  );
}
