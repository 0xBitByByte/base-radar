import type { ReactNode } from "react";

type NotificationGroupProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/**
 * One chronological date bucket (Today / Yesterday / Earlier) — a plain
 * date-divider heading with no icon, the same shape `TimelineGroup` uses.
 * `NotificationCenter`/`NotificationDrawer` decide whether a group renders
 * at all (omitted when it has zero notifications), never this component.
 */
export function NotificationGroup({ id, title, children }: NotificationGroupProps) {
  const headingId = `notification-group-${id}`;

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
