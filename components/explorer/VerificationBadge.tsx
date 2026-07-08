import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { VerificationStatus } from "@/data/projects/enums";

const STATUS_STYLE: Record<VerificationStatus, { label: string; color: GlowBadgeColor }> = {
  verified: { label: "Verified", color: "success" },
  community: { label: "Community", color: "primary" },
  unverified: { label: "Unverified", color: "muted" },
  flagged: { label: "Flagged", color: "danger" },
};

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
