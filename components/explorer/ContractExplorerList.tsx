import { ContractCard } from "@/components/explorer/ContractCard";
import type { ContractCard as ContractCardData } from "@/components/explorer/contractIntelligenceHelpers";

type ContractExplorerListProps = {
  cards: ContractCardData[];
};

/**
 * PR-084.03 — a plain renderer for an already-resolved contract array
 * (category → search → chain filter → sort all already applied upstream).
 * Mirrors `PoolExplorerList.tsx` exactly: does nothing more than render
 * what it's given, so a future pagination layer slots in above this
 * component without it changing.
 */
export function ContractExplorerList({ cards }: ContractExplorerListProps) {
  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-radar-light-border py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        No contracts match the current search and filters.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {cards.map((card) => (
        <ContractCard key={`${card.chain}-${card.address}`} card={card} />
      ))}
    </ul>
  );
}
