import { ColumnHeader } from "@/components/explorer/ColumnHeader";
import { SortableHeader } from "@/components/explorer/SortableHeader";
import type { SortState } from "@/components/explorer/sort";
import { cn } from "@/lib/utils";

type ExplorerTableHeaderProps = {
  sort: SortState;
  onSortChange: (next: SortState) => void;
  /** Whether the sticky header has scrolled to its pinned position — adds a subtle "landed" shadow/border. */
  isStuck?: boolean;
};

/** The pinned Name header cell — sticky in both directions, the header's own corner over the pinned body column. */
const PINNED_HEADER_CLASS =
  "sticky left-0 z-[1] border-r border-radar-light-border bg-radar-light-card dark:border-white/10 dark:bg-radar-card";

/**
 * `<thead>`, sticky at the top of the scroll container (docs/explorer/03
 * §9). Replaces the previously-named `StickyHeader` component — sticky
 * behavior is this component's own CSS responsibility rather than a
 * separate wrapper, per the approved PR5 architecture adjustment.
 */
export function ExplorerTableHeader({ sort, onSortChange, isStuck }: ExplorerTableHeaderProps) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-radar-light-card transition-shadow dark:bg-radar-card",
        isStuck && "shadow-md"
      )}
    >
      {/* border-b lives on the row, not `<thead>` — `border-collapse` tables don't render borders on row-groups. */}
      <tr className={cn(isStuck && "border-b border-radar-light-border dark:border-white/10")}>
        <SortableHeader field="name" label="Name" sort={sort} onSortChange={onSortChange} className={PINNED_HEADER_CLASS} />
        <ColumnHeader label="Category" />
        <ColumnHeader label="Verification" />
        <SortableHeader field="price" label="Price" align="right" sort={sort} onSortChange={onSortChange} />
        <SortableHeader field="changePct24h" label="24h Change" align="right" sort={sort} onSortChange={onSortChange} />
        <SortableHeader field="tvl" label="TVL" align="right" sort={sort} onSortChange={onSortChange} />
        <SortableHeader field="health" label="Health" sort={sort} onSortChange={onSortChange} />
        <SortableHeader field="confidence" label="Confidence" sort={sort} onSortChange={onSortChange} />
        <SortableHeader field="githubStars" label="GitHub Stars" align="right" sort={sort} onSortChange={onSortChange} />
        <ColumnHeader label="Actions" srOnly />
      </tr>
    </thead>
  );
}
