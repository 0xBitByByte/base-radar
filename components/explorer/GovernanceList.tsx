import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { GovernanceEvent, GovernanceStatus } from "@/lib/governance";

type GovernanceListProps = {
  /** Already known to be configured by the caller — `null`-vs-"not configured" is the caller's concern (it decides whether to render this section at all), this component only ever renders the events it's given. */
  events: GovernanceEvent[];
};

const GOVERNANCE_STATUS_COLOR: Record<GovernanceStatus, GlowBadgeColor> = {
  active: "accent",
  passed: "success",
  failed: "danger",
  pending: "muted",
};

/**
 * The governance-proposals list — extracted from `QuickViewCommunity.tsx`
 * (PR11) so the Project Profile page can reuse the exact same markup
 * instead of a second, parallel implementation.
 */
export function GovernanceList({ events }: GovernanceListProps) {
  if (events.length === 0) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">No active governance proposals.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <li
          key={event.proposalId}
          className="flex items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
        >
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate text-xs font-medium text-radar-light-text hover:underline dark:text-radar-white"
          >
            {event.title}
          </a>
          <GlowBadge color={GOVERNANCE_STATUS_COLOR[event.status]} className="shrink-0 capitalize">
            {event.status}
          </GlowBadge>
        </li>
      ))}
    </ul>
  );
}
