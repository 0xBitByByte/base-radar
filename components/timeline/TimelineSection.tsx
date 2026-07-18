import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type TimelineSectionProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
};

/**
 * The Timeline page's general section layout primitive — icon + heading +
 * content, the same shape `BriefSection`/`PortfolioSection` use. Used for
 * page-level blocks like Metrics; the chronological event groups
 * (Today/Yesterday/Earlier) use the narrower `TimelineGroup` instead.
 */
export function TimelineSection({ id, title, icon: Icon, children }: TimelineSectionProps) {
  const headingId = `timeline-section-${id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <h2 id={headingId} className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
