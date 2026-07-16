import { Landmark } from "lucide-react";

import { GovernanceList } from "@/components/explorer/GovernanceList";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GovernanceEvent } from "@/lib/governance";

type ProfileGovernanceProps = {
  /** `null` means no real governance source is configured for this project. */
  governance: GovernanceEvent[] | null;
  /** This project's real Snapshot space URL, when configured — the "View on Snapshot" source link (PR12.1 Req 7). */
  governanceUrl: string | null;
};

/**
 * Governance — PR11 Part 7. Reuses `GovernanceList` (extracted from
 * `QuickViewCommunity.tsx`) — same registry-gated, never-fabricated
 * Snapshot data, just given its own full section on the Profile page
 * instead of sharing a drawer subsection. PR12.1e Req 9: this section now
 * always renders (previously `governance === null` skipped it entirely,
 * leaving `ProfileSectionNav`'s "Governance" link pointing at nothing) —
 * the two real "no proposals" reasons (no Snapshot space configured at
 * all, vs. configured but currently zero live proposals) get distinct
 * `EmptyState`s so a reader never has to guess which one applies.
 */
export function ProfileGovernance({ governance, governanceUrl }: ProfileGovernanceProps) {
  return (
    <ProfileSectionCard
      id="governance"
      title="Governance"
      icon={Landmark}
      sourceLink={governanceUrl ? { href: governanceUrl, label: "Snapshot" } : undefined}
    >
      {governance === null ? (
        <EmptyState
          icon={Landmark}
          title="No governance proposals detected"
          description="No Snapshot space is configured for this project in the Base Radar registry. Checked just now — this section will populate automatically once one is added."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
              Registry Status: Not Configured
            </span>
          }
        />
      ) : governance.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No active proposals"
          description="This project's Snapshot space is configured, but returned zero proposals just now. This section updates automatically as new proposals are created."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-success/30 bg-radar-success/10 px-2.5 py-1 text-[11px] font-medium text-radar-success">
              Registry Status: Configured
            </span>
          }
        />
      ) : (
        <GovernanceList events={governance} />
      )}
    </ProfileSectionCard>
  );
}
