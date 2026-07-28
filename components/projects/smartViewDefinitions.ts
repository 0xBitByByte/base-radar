/**
 * Smart Views — four predefined filter+sort presets, each just a labeled
 * shortcut into a `?view=` the Directory pipeline already knows how to
 * render (`components/projects/queryState.ts`). "Needs Attention" and
 * "Fast Growing" are a second, more prominent entry point into the
 * already-existing `needsReview`/`topActivity` views — the exact same list,
 * filter, and sort a rail's own "View All" link already reaches. "Blue
 * Chips" and "Emerging" are the only two genuinely new views, and even
 * those are computed in `app/dashboard/projects/page.tsx` purely by
 * composing the same `filterLiveProjects`/`sortLiveProjects` every other
 * view already calls — no new backend logic, no new provider data.
 */

import type { ProjectsView } from "@/components/projects/queryState";

export type SmartViewId = "blueChips" | "emerging" | "needsAttention" | "fastGrowing";

export type SmartViewDefinition = {
  id: SmartViewId;
  emoji: string;
  label: string;
  /** One short line on the card — distinct from `VIEW_LABELS`/`RAIL_META`'s own Directory-facing copy for the underlying view. */
  description: string;
  /** Which `?view=` this card links to — reuses that view's already-computed base list, the user's own active filters on top, and its default sort exactly like every other `view` link on this page. */
  view: Exclude<ProjectsView, "all">;
};

export const SMART_VIEWS: SmartViewDefinition[] = [
  { id: "blueChips", emoji: "\u{1F48E}", label: "Blue Chips", description: "Verified · $100M+ TVL", view: "blueChips" },
  { id: "emerging", emoji: "\u{1F525}", label: "Emerging", description: "Recently discovered · high confidence", view: "emerging" },
  { id: "needsAttention", emoji: "\u{26A0}\u{FE0F}", label: "Needs Attention", description: "Flagged for review", view: "needsReview" },
  { id: "fastGrowing", emoji: "\u{1F680}", label: "Fast Growing", description: "Most active development", view: "topActivity" },
];
