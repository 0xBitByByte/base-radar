import type { SearchableItem, SearchGroup } from "@/lib/search/types";
import { CommandItem } from "@/components/command/CommandItem";

type CommandGroupProps = {
  group: SearchGroup;
  items: SearchableItem[];
  activeItemId: string | null;
  onSelect: (item: SearchableItem) => void;
  onHover: (itemId: string) => void;
};

/** One labeled section of the results listbox. `CommandResults` only ever calls this with a non-empty `items` slice (via `groupSearchResults`), so empty groups are never rendered. */
export function CommandGroup({ group, items, activeItemId, onSelect, onHover }: CommandGroupProps) {
  if (items.length === 0) return null;

  return (
    <section role="group" aria-label={group} className="mb-1">
      <p className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-radar-light-muted uppercase dark:text-radar-muted/60">
        {group}
      </p>
      {items.map((item) => (
        <CommandItem
          key={item.id}
          item={item}
          active={item.id === activeItemId}
          onSelect={onSelect}
          onHover={() => onHover(item.id)}
        />
      ))}
    </section>
  );
}
