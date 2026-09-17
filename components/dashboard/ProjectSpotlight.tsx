import { Sparkles } from "lucide-react";

import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import type { LiveProject } from "@/lib/projects/types";

type ProjectSpotlightProps = {
  liveProjects: LiveProject[];
  lastUpdated: string;
};

/**
 * Universal Project Card, PR-7 — retired the legacy `ProjectSpotlightData`
 * shape (a raw `defillama.getTopBaseProtocol()` read, independent of the
 * Project Registry, matching the same category of issue found and resolved
 * in PR-5) for the canonical `LiveProject` model. Selection is the single
 * `LiveProject` with the highest `market.tvlUsd` — "highest TVL on Base" is
 * explicitly about raw TVL across every category, not each project's own
 * category-routed primary metric, so `categoryAwarePrimaryMetricValue`
 * (Category Rank's own value function) isn't the right fit here.
 *
 * `LiveProjectCard variant="detailed"` already renders its own complete
 * card chrome (border/gradient/shadow) — the same chrome `WidgetCard`
 * itself applies. The `className` override below neutralizes the inner
 * card's chrome (`cn()` is `twMerge`-backed, so later classes reliably win
 * over most earlier conflicting ones) so this reads as one widget, not a
 * card nested inside a card. Verified live: border/shadow/padding merged
 * correctly via `twMerge`, but `bg-gradient-to-b`/`bg-none` were NOT
 * detected as conflicting by this project's `tailwind-merge` config (both
 * ended up in the final class list) — `!bg-none` (Tailwind's `!important`
 * prefix, the same working pattern already used for `WatchButton`'s
 * `!size-11` elsewhere in this file) forces the override at the CSS level
 * instead, independent of `twMerge`'s conflict detection.
 *
 * The previous "Quick View" modal duplicated a subset of what `detailed`
 * already shows inline (metrics, scores) — not rebuilt; `detailed` already
 * surfaces at a glance what Quick View existed to reveal via a click.
 */
// UX Polish, Part 8 Issue C — the `hover:border-transparent`/`hover:shadow-none`
// pair is now dead weight: `cardBody` (what these would have overridden)
// no longer carries any plain `hover:` classes of its own since the Part 1
// card-hover fix moved all hover reaction to elevation on a wrapper
// `peer-hover:` can actually reach — nothing left here to override.
// Removed rather than left as silent no-op dead code.
// V1-FIX-001 — `gap-2.5` (was the inherited `gap-3.5`) tightens the
// spacing between `cardBody`'s internal rows for this dashboard instance
// only; `twMerge` resolves it against the base class the same way it
// already resolves `p-0` above (see this file's own doc comment).
const SPOTLIGHT_CARD_CLASS = "border-0 border-transparent !bg-none shadow-none backdrop-blur-none p-0 gap-2.5";

export function ProjectSpotlight({ liveProjects, lastUpdated }: ProjectSpotlightProps) {
  const spotlight = liveProjects.reduce<LiveProject | null>((best, project) => {
    if (project.market.tvlUsd === null) return best;
    if (best === null || (project.market.tvlUsd ?? 0) > (best.market.tvlUsd ?? 0)) return project;
    return best;
  }, null);

  return (
    <WidgetCard
      icon={<Sparkles className="size-5" aria-hidden="true" />}
      title="Project Spotlight"
      subtitle="Auto-selected — highest TVL on Base (not from your Watchlist)"
      accent="primary"
      lastUpdated={lastUpdated}
      className="gap-3 p-4 sm:p-5"
    >
      {spotlight ? (
        <LiveProjectCard project={spotlight} variant="detailed" className={SPOTLIGHT_CARD_CLASS} soloCard />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No TVL data available"
          description="A featured project will appear here once TVL data is available for at least one tracked project."
        />
      )}
    </WidgetCard>
  );
}
