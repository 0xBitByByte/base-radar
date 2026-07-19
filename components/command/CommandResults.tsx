"use client";

import { groupSearchResults } from "@/lib/search/globalSearch";
import type { SearchableItem } from "@/lib/search/types";
import { CommandGroup } from "@/components/command/CommandGroup";
import { CommandEmpty } from "@/components/command/CommandEmpty";

type CommandResultsProps = {
  results: SearchableItem[];
  activeItemId: string | null;
  onSelect: (item: SearchableItem) => void;
  onHover: (itemId: string) => void;
};

/**
 * Renders `results` (already sorted by `globalSearch` — best match first,
 * regardless of type) grouped by `groupSearchResults`, whose section order
 * follows each group's first appearance in that score order — so the
 * section containing the single best match always renders first, not a
 * fixed "Commands always on top" order. `role="listbox"` pairs with each
 * `CommandItem`'s `role="option"` and the search input's
 * `aria-activedescendant`.
 */
export function CommandResults({ results, activeItemId, onSelect, onHover }: CommandResultsProps) {
  if (results.length === 0) {
    return <CommandEmpty />;
  }

  const groups = groupSearchResults(results);

  return (
    <div
      id="command-palette-listbox"
      role="listbox"
      aria-label="Search results"
      className="max-h-[60vh] overflow-y-auto p-2"
    >
      {groups.map(({ group, items }) => (
        <CommandGroup
          key={group}
          group={group}
          items={items}
          activeItemId={activeItemId}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
