import { BadgeCheck, HelpCircle } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";

type ProfileWhyItMattersProps = {
  highlights: string[];
};

/**
 * PR-050 follow-up Req 2 — "Why It Matters": ecosystem importance, liquidity,
 * governance, integrations, adoption. This is `report.highlights`
 * (`buildHighlights`, `lib/intelligence/report.ts`) — the same evidence-backed
 * bullets that used to render as "Why This Project Stands Out" inside the old
 * monolithic Executive Intelligence card — extracted into its own top-level
 * section, positioned right after Project Summary.
 *
 * Unlike Project Summary's thesis, `buildHighlights` can genuinely return an
 * empty list (a project with no strong developer/governance/liquidity signal,
 * no verified contracts, a single chain/pool, and unverified registry
 * status has nothing evidence-backed to highlight). Requirement #2 explicitly
 * asks that this case say importance "cannot yet be determined" rather than
 * hide the section or invent a reason — so, unlike every other `ReportBucket`-
 * style list on this page, this section always renders, with a real fallback
 * message when the list is empty.
 */
export function ProfileWhyItMatters({ highlights }: ProfileWhyItMattersProps) {
  return (
    <ProfileSectionCard id="why-it-matters" title="Why It Matters" icon={BadgeCheck}>
      {highlights.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold tracking-wider text-radar-light-muted uppercase dark:text-radar-muted">
            Evidence Supporting This Assessment
          </span>
          <ul className="flex flex-col gap-2">
            {highlights.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-radar-light-text dark:text-radar-white">
                <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-radar-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
            This project&apos;s importance can&apos;t yet be determined from available evidence — it doesn&apos;t currently show
            strong developer activity, governance participation, verified contracts, deep liquidity, or multi-chain/multi-pool
            adoption. This will update automatically as more real signal becomes available.
          </p>
        </div>
      )}
    </ProfileSectionCard>
  );
}
