import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { VerificationStatus } from "@/data/projects/enums";

const STATUS_STYLE: Record<VerificationStatus, { label: string; color: GlowBadgeColor }> = {
  verified: { label: "Verified", color: "success" },
  community: { label: "Community", color: "primary" },
  unverified: { label: "Unverified", color: "muted" },
  flagged: { label: "Flagged", color: "danger" },
};

/** The single source of truth for verification status display text — reused by the Filter Bar so the label never drifts from the badge. */
export function verificationStatusLabel(status: VerificationStatus): string {
  return STATUS_STYLE[status].label;
}

type VerificationBadgeProps = {
  status: VerificationStatus;
  className?: string;
};

/** Renders `community.verificationStatus` — never `Identity` (see docs/explorer/05 §4). */
export function VerificationBadge({ status, className }: VerificationBadgeProps) {
  const { label, color } = STATUS_STYLE[status];
  return (
    <GlowBadge color={color} className={className}>
      {label}
    </GlowBadge>
  );
}
