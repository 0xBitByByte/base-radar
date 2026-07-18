import type { ReactNode } from "react";

type TimelineGroupProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/**
 * One chronological date bucket (Today / Yesterday / Earlier) — a
 * lighter-weight heading than `TimelineSection` (no icon), matching the
 * plain date-divider convention Bloomberg/GitHub/Linear activity feeds
 * already use. `Timeline.tsx` decides whether a group renders at all
 * (omitted when it has zero events), never this component.
 */
export function TimelineGroup({ id, title, children }: TimelineGroupProps) {
  const headingId = `timeline-group-${id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3
        id={headingId}
        className="text-[10.5px] font-semibold tracking-[0.08em] text-radar-light-muted uppercase dark:text-radar-muted/70"
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}
