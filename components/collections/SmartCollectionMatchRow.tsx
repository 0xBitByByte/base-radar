import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SmartCollectionMatch } from "@/lib/smart-collections/types";
import { LiveProjectCard } from "@/components/projects/LiveProjectCard";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";

/**
 * PR-090.04 (Smart Collections) — one matched project. Reuses the existing
 * `LiveProjectCard` (`variant="compact"`) verbatim whenever a real
 * `LiveProject` is available (the 7 server-evaluated collections) — never a
 * second project-card design. The 3 client-evaluated collections
 * (Trending Narratives, Stable Projects, Yield Opportunities) only have a
 * lightweight `{id, name, slug}` reference (see `lib/smart-collections/types.ts`'s
 * own doc comment on why), so they fall back to a plain named link — still a
 * real route, never a broken one, just without the full-catalog enrichment
 * this feature doesn't need to ship to the client for those three.
 *
 * The evidence list and "why it matches" sentence render identically
 * either way — the same real facts every collection's evaluator already
 * produced, never re-derived here.
 */
export function SmartCollectionMatchRow({ match }: { match: SmartCollectionMatch }) {
  return (
    <li className={cn("flex flex-col gap-3 p-4", GLASS_TILE_SURFACE)}>
      {match.liveProject ? (
        <LiveProjectCard project={match.liveProject} variant="compact" />
      ) : match.projectSlug ? (
        <Link
          href={`/dashboard/projects/${match.projectSlug}`}
          className="w-fit text-sm font-semibold text-radar-light-text outline-none hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:hover:text-radar-accent"
        >
          {match.projectName}
        </Link>
      ) : (
        <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{match.projectName}</span>
      )}

      <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{match.reason}</p>

      {match.evidence.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-radar-light-border pt-2.5 dark:border-white/10">
          {match.evidence.map((item) => (
            <li key={item.label} className="flex items-baseline gap-1 text-[10.5px]">
              <span className="font-medium text-radar-light-muted dark:text-radar-muted">{item.label}:</span>
              <span className="text-radar-light-text dark:text-radar-white">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
