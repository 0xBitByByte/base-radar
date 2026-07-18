import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PortfolioSectionProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
};

/**
 * The Portfolio page's one section layout primitive — icon + heading +
 * content, the same shape `components/brief/BriefSection.tsx` uses.
 * `PortfolioOverview.tsx` decides whether a section renders at all
 * (omitted when its data is empty), never this component.
 */
export function PortfolioSection({ id, title, icon: Icon, children }: PortfolioSectionProps) {
  const headingId = `portfolio-section-${id}`;

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
