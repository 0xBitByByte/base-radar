import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type BriefSectionProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
};

/**
 * The Brief page's one section layout primitive — icon + heading + content.
 * Every section (Market Summary, Top Opportunities, Security/Governance/
 * Development/TVL Highlights, Emerging Narratives, Recommendations) reuses
 * this instead of repeating the header markup; `DailyBrief.tsx` decides
 * whether a section renders at all (omitted when its data is empty), never
 * this component.
 */
export function BriefSection({ id, title, icon: Icon, children }: BriefSectionProps) {
  const headingId = `brief-section-${id}`;

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
