import { formatLabel } from "@/components/explorer/format";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ProjectCategory, ProjectTag } from "@/data/projects/enums";

type ProjectCategoryChipsProps = {
  categories: ProjectCategory[];
  tags: ProjectTag[];
};

const MAX_CHIPS = 3;

/**
 * A dedicated row for category/tag chips — deliberately separate from
 * `ProjectCardHeader`, so categories get clear visual weight of their own
 * (crypto-native users scan categories first, per this PR's approved
 * layout). Primary category leads; tags fill the remaining slots, capped
 * at a small fixed number so every card keeps the same anatomy regardless
 * of how many tags a project has (card consistency, docs/explorer/03 §13).
 */
export function ProjectCategoryChips({ categories, tags }: ProjectCategoryChipsProps) {
  const allChips = [...categories, ...tags];
  const hasOverflow = allChips.length > MAX_CHIPS;
  // Reserve the last slot for a "+N" indicator when there's overflow, so
  // truncation is honest and visible rather than silently dropping chips
  // with no trace they existed.
  const visibleChips = hasOverflow ? allChips.slice(0, MAX_CHIPS - 1) : allChips.slice(0, MAX_CHIPS);
  const overflowCount = allChips.length - visibleChips.length;
  const hiddenChips = allChips.slice(visibleChips.length);

  if (visibleChips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleChips.map((chip) => (
        <GlowBadge key={chip} color="muted" className="px-2 py-0.5 text-[10.5px]">
          {formatLabel(chip)}
        </GlowBadge>
      ))}
      {overflowCount > 0 && (
        <Tooltip content={hiddenChips.map(formatLabel).join(", ")}>
          <GlowBadge
            color="muted"
            tabIndex={0}
            className="cursor-default px-2 py-0.5 text-[10.5px] outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            +{overflowCount}
          </GlowBadge>
        </Tooltip>
      )}
    </div>
  );
}
