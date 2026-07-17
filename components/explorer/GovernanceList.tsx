import { GlowBadge, type GlowBadgeColor } from "@/components/ui/GlowBadge";
import { formatDate } from "@/lib/data/format";
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

/** Real, forward-looking time-remaining text for an active proposal's `end` timestamp — the countdown counterpart to `formatRelativeTime`'s backward-looking "Xm/h/d ago", which doesn't apply here since `end` is still in the future. */
function formatTimeRemaining(endIso: string): string {
  const diffMs = new Date(endIso).getTime() - Date.now();
  if (diffMs <= 0) return "Voting ends now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `Voting ends in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Voting ends in ${hours}h`;
  const days = Math.round(hours / 24);
  return `Voting ends in ${days}d`;
}

function ProposalRow({ event, timeLabel }: { event: GovernanceEvent; timeLabel: string }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-xs font-medium text-radar-light-text hover:underline dark:text-radar-white"
        >
          {event.title}
        </a>
        <GlowBadge color={GOVERNANCE_STATUS_COLOR[event.status]} className="shrink-0 capitalize">
          {event.status}
        </GlowBadge>
      </div>
      {/* PR13.7 Goal 12 — real proposal description, from Snapshot's own `body` field (previously never requested). Truncated to 2 lines; the full text is one click away via the title link. */}
      {event.description && (
        <p className="line-clamp-2 text-[11px] text-radar-light-muted dark:text-radar-muted">{event.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>{timeLabel}</span>
        {event.participation !== null && <span>{event.participation.toFixed(0)}% participation</span>}
      </div>
    </li>
  );
}

/**
 * The governance-proposals list — PR13.6 Goal 13 groups the exact same real
 * `GovernanceEvent[]` (Snapshot data, unchanged) into Active/Upcoming/Recent
 * bands instead of one flat list, so a reader can immediately tell what
 * needs attention now vs. what's coming vs. what already happened. Every
 * field shown (`status`, `start`, `end`, `participation`) is already on
 * `GovernanceEvent` — no new provider call, nothing invented. Proposals with
 * no real `participation` figure simply omit that line rather than showing
 * a placeholder.
 */
export function GovernanceList({ events }: GovernanceListProps) {
  if (events.length === 0) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">No active governance proposals.</p>;
  }

  const active = events.filter((e) => e.status === "active");
  const upcoming = events.filter((e) => e.status === "pending");
  const recent = events
    .filter((e) => e.status === "passed" || e.status === "failed")
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Active Proposals
          </span>
          <ul className="flex flex-col gap-2">
            {active.map((event) => (
              <ProposalRow key={event.proposalId} event={event} timeLabel={formatTimeRemaining(event.end)} />
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Upcoming Proposals
          </span>
          <ul className="flex flex-col gap-2">
            {upcoming.map((event) => (
              <ProposalRow key={event.proposalId} event={event} timeLabel={`Voting starts ${formatDate(event.start)}`} />
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            Recent Proposals
          </span>
          <ul className="flex flex-col gap-2">
            {recent.map((event) => (
              <ProposalRow key={event.proposalId} event={event} timeLabel={`Voting ended ${formatDate(event.end)}`} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
