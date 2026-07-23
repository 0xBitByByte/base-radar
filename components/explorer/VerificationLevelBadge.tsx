import { CircleDot, Database, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { RichTooltip, type RichTooltipAccent } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { VerificationLevel } from "@/data/projects/enums";

const LEVEL_STYLE: Record<
  VerificationLevel,
  { label: string; color: GlowBadgeColor; tooltipAccent: RichTooltipAccent; icon: LucideIcon }
> = {
  discovered: { label: "Discovered", color: "muted", tooltipAccent: "muted", icon: CircleDot },
  indexed: { label: "Indexed", color: "primary", tooltipAccent: "primary", icon: Database },
  verified: { label: "Verified", color: "success", tooltipAccent: "success", icon: ShieldCheck },
  // GlowBadge's "accent" color has no RichTooltip equivalent (RichTooltipAccent
  // doesn't include it) — "primary" is the closest visual match for the tooltip only.
  "intelligence-ready": { label: "Intelligence Ready", color: "accent", tooltipAccent: "primary", icon: Sparkles },
};

/** Same wording as `VERIFICATION_LEVELS`' own doc comments (`data/projects/enums.ts`). */
const LEVEL_DESCRIPTION: Record<VerificationLevel, string> = {
  discovered: "Surfaced by a discovery source; no registry entry exists yet.",
  indexed: "A full registry entry with core identity fields and provider IDs.",
  verified: "Reviewed against primary sources; provider IDs confirmed to match.",
  "intelligence-ready": "Enough live data resolves for the Alert Engine, Health Scorecard, and Daily Brief.",
};

type VerificationLevelBadgeProps = {
  /** `undefined` when the registry hasn't recorded a level for this project yet — renders nothing (PR-038: never a placeholder). */
  level: VerificationLevel | undefined;
  className?: string;
};

/**
 * PR-038 — pipeline-progress badge, distinct from `VerificationBadge`
 * (editorial trust). Renders `null` when `level` is unset rather than a
 * placeholder/"—"/"Unknown" — every current seed project has no
 * `verificationLevel` recorded yet, so this badge is invisible everywhere
 * today and will appear automatically once registry data adopts the field.
 */
export function VerificationLevelBadge({ level, className }: VerificationLevelBadgeProps) {
  if (!level) return null;

  const { label, color, tooltipAccent, icon: Icon } = LEVEL_STYLE[level];

  return (
    <Tooltip
      content={<RichTooltip icon={Icon} title={label} accent={tooltipAccent} description={LEVEL_DESCRIPTION[level]} />}
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
