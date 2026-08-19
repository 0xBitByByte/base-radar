import { GovernanceCard } from "@/components/explorer/GovernanceCard";
import type { GovernanceEvent } from "@/lib/governance";

type GovernanceExplorerListProps = {
  events: GovernanceEvent[];
};

/**
 * PR-084.04 — a plain renderer for an already-resolved proposal array
 * (category → search → sort all already applied upstream). Mirrors
 * `ContractExplorerList.tsx`/`PoolExplorerList.tsx` exactly.
 */
export function GovernanceExplorerList({ events }: GovernanceExplorerListProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-radar-light-border py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        No proposals match the current search and filters.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <GovernanceCard key={event.proposalId} event={event} />
      ))}
    </ul>
  );
}
