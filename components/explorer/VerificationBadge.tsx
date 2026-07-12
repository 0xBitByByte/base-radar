import { BadgeCheck, CircleAlert, Flag, Users, type LucideIcon } from "lucide-react";

import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/data/projects/enums";

const STATUS_ACCENT: Record<VerificationStatus, "success" | "primary" | "muted" | "danger"> = {
  verified: "success",
  community: "primary",
  unverified: "muted",
  flagged: "danger",
};

const STATUS_STYLE: Record<VerificationStatus, { label: string; color: GlowBadgeColor; icon: LucideIcon }> = {
  verified: { label: "Verified", color: "success", icon: BadgeCheck },
  community: { label: "Community", color: "primary", icon: Users },
  unverified: { label: "Unverified", color: "muted", icon: CircleAlert },
  flagged: { label: "Flagged", color: "danger", icon: Flag },
};

/** Same wording as `VERIFICATION_STATUSES`' own doc comments (`data/projects/enums.ts`) — one description per status, not re-authored here. "Verified" vs. "Community" in particular isn't obvious from the label alone. */
const STATUS_DESCRIPTION: Record<VerificationStatus, string> = {
  verified: "Identity, links and contracts manually reviewed by the Base Radar team.",
  community: "Sourced from a reputable community/ecosystem directory, not independently confirmed.",
  unverified: "Self-reported or freshly added; not yet reviewed.",
  flagged: "Known issue (mismatched contract, impersonation report, etc.) — kept for transparency.",
};

/** Fixed left-to-right order every consumer renders the four statuses in — never re-ordered per project, only the active one changes. */
const STATUS_ORDER: VerificationStatus[] = ["verified", "community", "unverified", "flagged"];

/** The single source of truth for verification status display text — reused by the Filter Bar so the label never drifts from the badge. */
export function verificationStatusLabel(status: VerificationStatus): string {
  return STATUS_STYLE[status].label;
}

type VerificationBadgeProps = {
  status: VerificationStatus;
  /** Denser padding/font/icon size for the Table's Verification column, matching `ChainBadge`'s `size="sm"` density — Grid and Quick View keep the roomier default. */
  compact?: boolean;
  className?: string;
};

/**
 * Renders `community.verificationStatus` — never `Identity` (see
 * docs/explorer/05 §4). Always shows all four possible statuses in one
 * fixed row: the project's actual status expands into a colored, labeled
 * badge; the other three render as small dimmed icons (hoverable/
 * focusable for their own description) — so "Verified" visibly reads as
 * "Verified, not Community, not Unverified, not Flagged" rather than
 * requiring a viewer to already know what the other states look like.
 * One shared component — Grid, Table, and Quick View all render the
 * identical markup, never a second version.
 */
export function VerificationBadge({ status, compact, className }: VerificationBadgeProps) {
  // The active status always renders first — so its badge starts at the
  // same x-position in every row/card regardless of which status is
  // active (previously STATUS_ORDER's fixed verified→community→
  // unverified→flagged sequence meant the badge's position, and its
  // start x, shifted depending on which one was active).
  const orderedStatuses = [status, ...STATUS_ORDER.filter((candidate) => candidate !== status)];

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {orderedStatuses.map((candidate) => {
        const { label, color, icon: Icon } = STATUS_STYLE[candidate];
        const isActive = candidate === status;

        const tooltipContent = (
          <RichTooltip icon={Icon} title={label} accent={STATUS_ACCENT[candidate]} description={STATUS_DESCRIPTION[candidate]} />
        );

        if (!isActive) {
          return (
            <Tooltip key={candidate} content={tooltipContent}>
              <span
                role="img"
                aria-label={label}
                tabIndex={0}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full text-radar-light-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted/30",
                  compact ? "size-4" : "size-5"
                )}
              >
                <Icon className={compact ? "size-2.5" : "size-3"} aria-hidden="true" />
              </span>
            </Tooltip>
          );
        }

        return (
          <Tooltip key={candidate} content={tooltipContent}>
            <GlowBadge
              color={color}
              tabIndex={0}
              className={cn(
                "shrink-0 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                compact && "gap-1 px-1.5 py-0.5 text-[10px]"
              )}
            >
              <Icon className={cn("shrink-0", compact ? "size-2.5" : "size-3")} aria-hidden="true" />
              {label}
            </GlowBadge>
          </Tooltip>
        );
      })}
    </div>
  );
}
