import { Compass, History, RefreshCw, Sparkles, Tag, TrendingUp, Vote, Waves, type LucideIcon } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import type { DevelopmentCategory, DevelopmentEntry } from "@/lib/intelligence/report";

type ProfileRecentHighlightsProps = {
  entries: DevelopmentEntry[];
};

/** Same iconography convention as the Timeline's own category icons (`ProfileTimeline.tsx`'s `KIND_ICON`), so a release/whale/governance/TVL event reads the same wherever it appears on this page. */
const CATEGORY_ICON: Record<DevelopmentCategory, LucideIcon> = {
  release: Tag,
  governance: Vote,
  tvl: TrendingUp,
  whale: Waves,
  registry: RefreshCw,
  discovery: Compass,
};

const CATEGORY_LABEL: Record<DevelopmentCategory, string> = {
  release: "Release",
  governance: "Governance",
  tvl: "TVL",
  whale: "Whale Activity",
  registry: "Registry",
  discovery: "Discovery",
};

/**
 * PR-050 follow-up Req 4 — "Recent Highlights," deliberately NOT the full
 * Timeline: a compact, ranked-by-importance top-5 (`report.recentDevelopments`,
 * `buildIntelligenceReport`) summarizing only the changes that actually
 * matter (a real TVL swing, a new release, an active governance proposal,
 * a whale transfer) — the exact content that used to render as "Recent
 * Developments" buried inside the old monolithic Executive Intelligence
 * card, extracted into its own top-level section and positioned right
 * before the full chronological Timeline, per the reviewer's mandated flow.
 * When nothing real qualifies, this says so plainly rather than being
 * silently omitted — mirroring the Timeline's own empty state
 * (`ProfileTimeline.tsx`).
 */
export function ProfileRecentHighlights({ entries }: ProfileRecentHighlightsProps) {
  return (
    <ProfileSectionCard id="recent-highlights" title="Recent Highlights" icon={Sparkles}>
      {entries.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {entries.map((entry, index) => {
            const CategoryIcon = CATEGORY_ICON[entry.category];
            return (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted"
                  aria-hidden="true"
                >
                  <CategoryIcon className="size-3.5 shrink-0" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                      <span className="sr-only">{CATEGORY_LABEL[entry.category]}: </span>
                      {entry.headline}
                    </span>
                    <span className="shrink-0 text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">{entry.date}</span>
                  </div>
                  <span className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">{entry.detail}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
          <History className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
            No recent project activity has been detected — no new releases, governance proposals, notable TVL swings, large
            on-chain transfers, or registry/discovery updates in the last 30 days. This isn&apos;t a data gap: it means this
            project has been quiet, not that something failed to load. Real activity will appear here automatically as it
            happens.
          </p>
        </div>
      )}
    </ProfileSectionCard>
  );
}
