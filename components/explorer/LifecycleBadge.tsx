import {
  Archive,
  CircleDot,
  Copy,
  MoveRight,
  ShieldAlert,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";

import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip, type RichTooltipAccent } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { RegistryLifecycleState } from "@/data/projects/enums";

/**
 * `"active"` (the default/expected state for every ordinary entry) is
 * deliberately excluded — showing it on every card would be pure noise
 * (PR-038 scope item 5) for a state that's already the assumed default
 * when `lifecycle` is unset at all. Only genuinely exceptional states get
 * a badge, matching this codebase's "surface what's unusual, not what's
 * expected" convention.
 */
const LIFECYCLE_STYLE: Partial<
  Record<RegistryLifecycleState, { label: string; color: GlowBadgeColor; tooltipAccent: RichTooltipAccent; icon: LucideIcon }>
> = {
  discovered: { label: "Discovered", color: "muted", tooltipAccent: "muted", icon: CircleDot },
  inactive: { label: "Inactive", color: "muted", tooltipAccent: "muted", icon: ShieldOff },
  archived: { label: "Archived", color: "muted", tooltipAccent: "muted", icon: Archive },
  duplicate: { label: "Duplicate", color: "warning", tooltipAccent: "warning", icon: Copy },
  migrated: { label: "Migrated", color: "warning", tooltipAccent: "warning", icon: MoveRight },
  scam: { label: "Scam", color: "danger", tooltipAccent: "danger", icon: ShieldAlert },
};

/** Same wording as `REGISTRY_LIFECYCLE_STATES`' own doc comments (`data/projects/enums.ts`). */
const LIFECYCLE_DESCRIPTION: Partial<Record<RegistryLifecycleState, string>> = {
  discovered: "Surfaced by a discovery source; no full registry entry exists yet.",
  inactive: "Still a valid entry, excluded from default discovery surfaces.",
  archived: "Deliberately removed from active discovery — kept for historical reference.",
  duplicate: "A confirmed duplicate of another registry entry.",
  migrated: "Superseded by a successor entry.",
  scam: "Confirmed fraudulent or malicious — kept for transparency, never surfaced in discovery.",
};

type LifecycleBadgeProps = {
  /** `undefined` (no `lifecycle` recorded) or `"active"` both render nothing — PR-038: never a placeholder, and "active" is the assumed default, not worth a badge. */
  state: RegistryLifecycleState | undefined;
  className?: string;
};

/**
 * PR-038 — registry-record lifecycle badge. Renders `null` for an unset
 * `lifecycle` (every current seed project) or an explicit `"active"` state
 * — only the exceptional states (archived/duplicate/migrated/scam/
 * inactive/discovered) ever produce a visible badge.
 */
export function LifecycleBadge({ state, className }: LifecycleBadgeProps) {
  if (!state) return null;
  const style = LIFECYCLE_STYLE[state];
  if (!style) return null;

  const { label, color, tooltipAccent, icon: Icon } = style;

  return (
    <Tooltip
      content={
        <RichTooltip icon={Icon} title={label} accent={tooltipAccent} description={LIFECYCLE_DESCRIPTION[state]} />
      }
    >
      <GlowBadge
        color={color}
        tabIndex={0}
        className={cn("shrink-0 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50", className)}
      >
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        {label}
      </GlowBadge>
    </Tooltip>
  );
}
