import type { ReactNode } from "react";
import { ExternalLink, type LucideIcon } from "lucide-react";

import { QuickViewSectionLabel } from "@/components/explorer/QuickViewSectionLabel";
import { Tooltip } from "@/components/ui/Tooltip";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { cn } from "@/lib/utils";

export type ProfileSectionSourceLink = {
  href: string;
  label: string;
};

type ProfileSectionCardProps = {
  title?: ReactNode;
  /** PR12.1c Req 4 — a small icon rendered beside the title, giving every section a distinct visual anchor instead of text-only headings. Omit for sections with no title. */
  icon?: LucideIcon;
  id?: string;
  children: ReactNode;
  className?: string;
  /** PR12.1 Req 7 — a small new-tab link to this section's official external source (CoinGecko, DefiLlama, BaseScan, GitHub, Snapshot, ...), rendered beside the title. Omit when this section has no real external source (e.g. Network). */
  sourceLink?: ProfileSectionSourceLink;
};

/**
 * The shared card recipe `ProfileHeader` already established
 * (`rounded-2xl border ... bg-radar-light-card p-5 ... sm:p-6`), extracted
 * here because PR11.1 needs it in five-plus places (Intelligence rail
 * groups, the AI summary band, the scores band) — a genuine repeated
 * pattern, not a speculative one-off.
 *
 * PR-086.02 — upgraded from a fully opaque shell to `GLASS_SURFACE_STATIC`:
 * every major Project Details section (Health & Trust, Why It Matters,
 * Community & Developer Activity, Sources, ...) renders inside this one
 * component, so this is the single highest-leverage place to make the
 * whole page read as glass, rather than hand-tuning each section.
 */
export function ProfileSectionCard({ title, icon: Icon, id, children, className, sourceLink }: ProfileSectionCardProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-28 flex flex-col gap-3 p-5 sm:p-6", GLASS_SURFACE_STATIC, className)}
    >
      {(title || sourceLink) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />}
              <QuickViewSectionLabel>{title}</QuickViewSectionLabel>
            </div>
          )}
          {sourceLink && (
            <Tooltip content={`View on ${sourceLink.label}`}>
              <a
                href={sourceLink.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View source on ${sourceLink.label}`}
                className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-primary focus-visible:text-radar-primary dark:text-radar-muted dark:hover:text-radar-accent dark:focus-visible:text-radar-accent"
              >
                {sourceLink.label}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </Tooltip>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
