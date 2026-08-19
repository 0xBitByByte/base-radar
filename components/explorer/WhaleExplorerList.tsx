import { WhaleCard } from "@/components/explorer/WhaleCard";
import type { WhaleEvent } from "@/lib/whale";

type WhaleExplorerListProps = {
  events: WhaleEvent[];
  explorerUrl: string | null;
};

/**
 * PR-084.05 — a plain renderer for an already-resolved transfer array
 * (category → search → sort all already applied upstream). Mirrors
 * `GovernanceExplorerList.tsx`/`ContractExplorerList.tsx` exactly.
 */
export function WhaleExplorerList({ events, explorerUrl }: WhaleExplorerListProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-radar-light-border py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        No transfers match the current search and filters.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <WhaleCard key={event.id} event={event} explorerUrl={explorerUrl} />
      ))}
    </ul>
  );
}
