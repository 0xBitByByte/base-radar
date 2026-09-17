import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { ChainBadgeGroup } from "@/components/branding/ChainBadgeGroup";
import { categoryPrimaryMetric } from "@/lib/projects/primaryMetric";
import type { LiveProject } from "@/lib/projects/types";

type SearchProjectRowProps = {
  project: LiveProject;
};

/**
 * Universal Project Card, PR-8 — a project search result's content, at the
 * same five-field density §5.B's `micro` tier defines (logo, name, one
 * chain badge, AI Rating, primary metric), reusing the same shared
 * primitives `LiveProjectCard`'s own `micro` branch reuses
 * (`ProjectLogo`, `ChainBadgeGroup`, `categoryPrimaryMetric`) — never a
 * second, independently-maintained selection/formatting rule.
 *
 * Deliberately does NOT render `LiveProjectCard` itself: that component's
 * `micro` branch wraps its content in its own `<Link>` when the project has
 * a slug, which would nest an `<a>` inside `CommandItem`'s own
 * `role="option"` `<button>` — invalid HTML and a real interactive-nesting
 * violation. `CommandItem` owns all interaction (`role="option"`, keyboard
 * handling, `onSelect`, `recordSearch`, `closePalette`, `router.push`) —
 * this component is pure presentation, exactly mirroring `micro`'s visual
 * content with no interactive element of its own.
 */
export function SearchProjectRow({ project }: SearchProjectRowProps) {
  const { identity, chains, aiRating } = project;
  const metric = categoryPrimaryMetric(project);

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <ProjectLogo logoUrl={identity.logoUrl} fallbackUrls={identity.logoUrlFallbacks} name={identity.name} size={20} />
      <span className="min-w-0 flex-1 truncate font-medium text-radar-light-text dark:text-radar-white">
        {identity.name}
      </span>
      <ChainBadgeGroup chains={chains} size="sm" max={1} className="shrink-0 flex-nowrap" />
      <span className="shrink-0 text-xs font-semibold text-radar-light-text dark:text-radar-white">{aiRating ?? "—"}</span>
      <span
        title={metric.value ?? "Not Tracked"}
        className="shrink-0 truncate text-xs tabular-nums text-radar-light-muted dark:text-radar-muted"
      >
        {metric.value ?? "Not Tracked"}
      </span>
    </span>
  );
}
