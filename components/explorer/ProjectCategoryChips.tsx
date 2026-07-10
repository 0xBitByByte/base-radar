import { formatLabel } from "@/components/explorer/format";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { getDisplayCategories } from "@/lib/branding/projects";
import { cn } from "@/lib/utils";
import type { ProjectCategory, ProjectTag } from "@/data/projects/enums";

type ProjectCategoryChipsProps = {
  categories: ProjectCategory[];
  tags: ProjectTag[];
  /** `ProjectCard`-only: reserves two chip rows' worth of height regardless of content, so every card's metrics grid starts on the same baseline. Quick View's header has no such alignment constraint, so it opts out. */
  reserveHeight?: boolean;
};

/**
 * Every real project in the registry has at most 2 categories + 2 tags
 * (4 combined) today; 6 gives full headroom above that without ever
 * triggering "+N" for current data, while still bounding a pathological
 * future case. Utilizes the second wrapped row `reserveHeight` already
 * reserves, rather than truncating before that space is used.
 */
const MAX_CHIPS = 6;

/**
 * A dedicated row for category/tag chips only — deliberately separate from
 * both `ProjectCardHeader` and the Chain indicator (`ProjectCard` renders
 * `ChainBadgeGroup` on its own line above this one), so Category (a
 * neutral taxonomy chip) and Chain (a colored, logo-bearing brand
 * indicator) read as two distinct concepts rather than one merged row of
 * same-looking pills. Always alphabetical (A→Z by display label), never
 * registry/backend order — every category and tag a project actually has,
 * up to `MAX_CHIPS` (card consistency, docs/explorer/03 §13).
 *
 * `reserveHeight` (measured: one row is 21.75px + `gap-1.5`'s 6px between
 * wrapped lines, so two rows is 50px) reserves that height regardless of
 * how many chips a project actually has — every `ProjectCard`'s metrics
 * grid then starts on the same baseline, whether this project's chips fit
 * one row or wrap to two (card consistency, docs/explorer/03 §13).
 */
export function ProjectCategoryChips({ categories, tags, reserveHeight }: ProjectCategoryChipsProps) {
  const { visible: visibleChips, hidden: hiddenChips } = getDisplayCategories(
    categories,
    tags,
    MAX_CHIPS,
    formatLabel
  );
  const overflowCount = hiddenChips.length;

  if (visibleChips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", reserveHeight && "min-h-[50px]")}>
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
