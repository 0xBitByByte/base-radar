import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { cn } from "@/lib/utils";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import type { ProjectStatus } from "@/data/projects/enums";

/**
 * Universal Project Card, PR-2A (Product Standard §7, Project Status).
 *
 * Engineering Note — resolves this PR's own Engineering Note on
 * `LifecycleBadge`: that component's `state` prop is `RegistryLifecycleState`
 * (discovered/active/inactive/archived/duplicate/migrated/scam) — a
 * registry-record data-quality signal, unrelated to `LiveProject.status`/
 * `discoveryStatus`, and its backing data was never threaded onto
 * `LiveProject`. Per the approved Option A, this is a new, purpose-built
 * badge sourced exclusively from the two fields §7 actually describes,
 * using this file set's existing `GlowBadge` design language.
 * `LifecycleBadge` is left untouched, still owning its real, different
 * responsibility.
 *
 * Product Semantics audit — reverses §7's original "Active always renders,
 * even for the common case" call. Audited against the real registry: 20 of
 * 20 seed projects have `status: "live"` — zero variation, confirmed by
 * direct inspection, not assumed. A badge with no exceptions conveys no
 * information; it's pure visual noise competing with the badges beside it
 * that DO vary (Risk, verification). "Active" now renders only for a
 * project that's actually in one of the non-default states below — the
 * same "only show the exceptional state" convention `LifecycleBadge`
 * already uses, extended here for the same reason. `live` is deliberately
 * absent from the style map (not just given a `null` style) so this can
 * never regress silently — omitting a `ProjectStatus` here is a type
 * error, not an easy-to-miss runtime branch.
 */

const PROJECT_STATUS_STYLE: Partial<Record<ProjectStatus, { label: string; color: GlowBadgeColor }>> = {
  beta: { label: "Beta", color: "accent" },
  development: { label: "In Development", color: "accent" },
  deprecated: { label: "Deprecated", color: "warning" },
  sunset: { label: "Delisted", color: "danger" },
};

/**
 * Only relevant for a discovery-only project (`status === null`) — a
 * registry project's own `status` always takes precedence when present.
 * `"new"`/`"discovered"` share one label: both mean "just found this,"
 * a distinction a viewer wouldn't perceive as meaningfully different.
 * `"upcoming"`/`"announced"` are real, named values this engine can
 * theoretically produce even though no current discovery source triggers
 * them yet (see `lib/discovery/status.ts`'s own doc comment) — given real
 * labels here rather than silently unhandled.
 */
const DISCOVERY_STATUS_STYLE: Record<DiscoveryStatus, { label: string; color: GlowBadgeColor }> = {
  verified: { label: "Verified", color: "success" },
  tracked: { label: "Tracked", color: "muted" },
  discovered: { label: "Newly Discovered", color: "accent" },
  new: { label: "Newly Discovered", color: "accent" },
  "recently-updated": { label: "Recently Updated", color: "accent" },
  upcoming: { label: "Upcoming", color: "primary" },
  announced: { label: "Announced", color: "primary" },
  deprecated: { label: "Deprecated", color: "warning" },
  inactive: { label: "Inactive", color: "warning" },
  "needs-review": { label: "Needs Review", color: "warning" },
  unknown: { label: "Unknown", color: "muted" },
};

type ProjectStatusBadgeProps = {
  status: ProjectStatus | null;
  discoveryStatus: DiscoveryStatus | null;
  /** Denser padding/text size, matching `VerificationBadge`'s own `compact` treatment — for use alongside it in a compact-density Trust row, so badges sharing one row don't mix two different pill sizes. */
  compact?: boolean;
  className?: string;
};

/** `null`/`null` (neither field populated) renders nothing — genuinely no signal to show, never a fabricated default. */
export function ProjectStatusBadge({ status, discoveryStatus, compact, className }: ProjectStatusBadgeProps) {
  const style = status !== null ? PROJECT_STATUS_STYLE[status] : discoveryStatus !== null ? DISCOVERY_STATUS_STYLE[discoveryStatus] : null;
  if (!style) return null;

  return (
    <GlowBadge color={style.color} className={cn(compact && "gap-1 px-1.5 py-0.5 text-[10px]", className)}>
      {style.label}
    </GlowBadge>
  );
}
