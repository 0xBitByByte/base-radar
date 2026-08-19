import { ArrowRight, Landmark } from "lucide-react";
import Link from "next/link";

import { GovernanceList } from "@/components/explorer/GovernanceList";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GovernanceEvent } from "@/lib/governance";

type ProfileGovernanceProps = {
  /** `null` means no real governance source is configured for this project. */
  governance: GovernanceEvent[] | null;
  /** This project's real Snapshot space URL, when configured — the "View on Snapshot" source link (PR12.1 Req 7). */
  governanceUrl: string | null;
  /** PR-074/PR-075 — `"on-chain"`/`"forum"`/`"none"` mean `governance === null` is a real, confirmed fact about how this project actually governs itself, not a registry gap — see `data/projects/types.ts`'s `ProjectGovernance.governanceType`. */
  governanceType: "snapshot" | "on-chain" | "forum" | "none" | null;
  /** PR-084.04 — the real Governance Explorer route for this project (`/dashboard/projects/{slug}/governance`), built once in `page.tsx` from `slug`. */
  governanceHref: string;
};

/** One entry per non-Snapshot `governanceType` — keeps the three real, confirmed-mechanism empty states from drifting out of sync with each other. */
const GOVERNANCE_TYPE_EMPTY_STATE: Record<"on-chain" | "forum" | "none", { title: string; description: string; badge: string }> = {
  "on-chain": {
    title: "Governance uses on-chain voting",
    description:
      "This project doesn't use Snapshot for governance — real decisions are made through on-chain voting instead, which Base Radar doesn't currently track. This isn't a missing registry entry; it's how this project actually governs itself.",
    badge: "Governance Uses On-chain Voting",
  },
  forum: {
    title: "Governance uses forum discussion",
    description:
      "This project doesn't use Snapshot for governance — real decisions are made through forum discussion and signaling instead, which Base Radar doesn't currently track. This isn't a missing registry entry; it's how this project actually governs itself.",
    badge: "Governance Uses Forum Discussion",
  },
  none: {
    title: "No governance mechanism",
    description: "This project is confirmed to have no governance mechanism — no token vote, on-chain process, or forum. There is nothing for this section to track.",
    badge: "No Governance",
  },
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
export function ProfileGovernance({ governance, governanceUrl, governanceType, governanceHref }: ProfileGovernanceProps) {
  return (
    <ProfileSectionCard
      id="governance"
      title="Governance"
      icon={Landmark}
      sourceLink={governanceUrl ? { href: governanceUrl, label: "Snapshot" } : undefined}
    >
      {governance === null ? (
        governanceType === "on-chain" || governanceType === "forum" || governanceType === "none" ? (
          <EmptyState
            icon={Landmark}
            title={GOVERNANCE_TYPE_EMPTY_STATE[governanceType].title}
            description={GOVERNANCE_TYPE_EMPTY_STATE[governanceType].description}
            className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
                {GOVERNANCE_TYPE_EMPTY_STATE[governanceType].badge}
              </span>
            }
          />
        ) : (
          <EmptyState
            icon={Landmark}
            title="No governance proposals detected"
            description="No Snapshot space is configured for this project in the Base Radar registry. Checked just now — this section will populate automatically once one is added."
            className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-card px-2.5 py-1 text-[11px] font-medium text-radar-light-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-radar-muted">
                Registry Missing
              </span>
            }
          />
        )
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
        <>
          <GovernanceList events={governance} />
          {/* PR-084.04 — real destination: Base Radar Intelligence categories
              (Active/Passed/Failed/Outcome Uncertain/Participation/...),
              search/sort over every fetched proposal. */}
          <Link
            href={governanceHref}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-radar-light-border py-2 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:border-radar-primary/40 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-accent/40 dark:hover:text-radar-accent"
          >
            View All Governance ({governance.length})
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
    </ProfileSectionCard>
  );
}
