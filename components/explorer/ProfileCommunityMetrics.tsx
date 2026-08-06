import { Suspense } from "react";
import { BookOpen, ExternalLink, GitBranch, Info, Link2, Users, type LucideIcon } from "lucide-react";

import { MetricItem } from "@/components/explorer/MetricItem";
import { MetricItemRelativeTime } from "@/components/explorer/MetricItemRelativeTime";
import { MetricItemSkeleton } from "@/components/explorer/MetricItemSkeleton";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { ProfileCommitsAsync } from "@/components/explorer/ProfileCommitsAsync";
import { ProfileContributorsAsync } from "@/components/explorer/ProfileContributorsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { describeUnavailable } from "@/components/explorer/ProfileSources";
import { GITHUB_STARS_INFO_TOOLTIP } from "@/components/explorer/metricTooltips";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactNumber, formatDate, formatNumber } from "@/lib/data/format";
import type { Community, GithubIntel, Sources } from "@/lib/intelligence/types";
import type { GithubRepoRef } from "@/data/projects/types";
import type { CommitActivity, ContributorCount } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileCommunityMetricsProps = {
  github: GithubIntel;
  community: Community;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  /** PR-079 — moved here from `ProfileMetrics.tsx`'s old "Engineering Health" section (merged into this one, see file doc comment below). */
  commitActivityPromise: Promise<ProviderResult<CommitActivity> | null>;
  githubRepo: GithubRepoRef | null;
  /** Real registry-level signal (`Boolean(project.github)`) — distinct from `github.available`, which is also `false` when a *configured* repo's live fetch fails (rate limit, network error). Lets each tile's reason say the accurate thing instead of always blaming "no repository configured." */
  githubConfigured: boolean;
  /** PR-074 — real per-provider fetch status/reason, already computed for the Evidence & Sources panel — reused so these tiles can name the actual cause (rate limit, network error, etc.) instead of a generic "GitHub returned no data." */
  sources: Sources;
  /**
   * PR-074 REVIEW #5 — the same real, zero-fetch registry-presence count the
   * Health Scorecard's Community tile already computes (`page.tsx`'s
   * `communityLinkFields`) — website, GitHub, X, Discord, Telegram,
   * Farcaster, governance, docs, blog, forum, Medium, Mirror, LinkedIn.
   */
  communityLinkCount: number;
  communityLinkTotal: number;
};

/** One metric slot — real value, or a two-line "Not Currently Available" + honest reason. Every slot in this section always renders (PR13.7 Goal 2's explicit ask), never silently omitted. */
function CommunityMetricTile({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        {children}
      </div>
    </div>
  );
}

function AvailableValue({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">{children}</span>;
}

function NotCurrentlyAvailable({ reason }: { reason: string }) {
  return (
    <>
      <span className="text-sm font-bold text-radar-light-muted dark:text-radar-muted">Not Currently Available</span>
      <span className="text-[10.5px] leading-snug text-radar-light-muted dark:text-radar-muted">{reason}</span>
    </>
  );
}

/**
 * UX polish pass, Section 3 — a clean 4-column grid (Stars/Forks/Issues/Commits)
 * instead of the previous 3-column layout, which wrapped 4 items awkwardly
 * (3 then 1).
 *
 * PR-080 Task 3 — Stars/Forks/Issues/Commits render as four individually
 * bordered cards (`MetricItem` without `bare`, the same visual language as
 * the Overview zone's `MetricCardGroup` tiles), so this grid only owns the
 * layout, not a second, redundant border around already-bordered tiles.
 *
 * PR-082 — the Repository Metadata row (Latest Release/Language/License/Last
 * Push/Repo Age) now gets the same individual-card treatment, one row of 5
 * instead of the old shared-bordered-box of `bare` label/value pairs.
 */
const DEVELOPER_METRIC_GRID_CLASS = "grid grid-cols-2 gap-2.5 sm:grid-cols-4";
const REPO_METADATA_GRID_CLASS = "grid grid-cols-2 gap-2.5 sm:grid-cols-5";

/**
 * PR-079 Section 4 — "Project Intelligence": Community Metrics
 * (PR13.7 Goal 2) merged with `ProfileMetrics.tsx`'s old "Engineering
 * Health" section. Before this merge, GitHub Stars/Forks rendered in BOTH
 * sections independently — a confirmed, real duplication (the same two
 * numbers, computed once, shown twice). After this merge there is exactly
 * one Stars/Forks rendering: the richer Engineering Health version (which
 * also carries Open Issues, Commits, release/language/license/repo-age
 * metadata, the `Stale` badge, and the "Developer Snapshot"/"Repository not
 * linked" empty states) — Community's own tiles for those two are
 * removed. Contributors (a Community-only metric) is kept and now sits
 * alongside the rest of the GitHub evidence instead of in a separate
 * section. Community Channels and Documentation (real, zero-fetch,
 * independent of GitHub's rate limit) still always render first.
 *
 * No new provider call anywhere in this merge — every field already existed
 * on `github`/`community`/`commitActivityPromise`/`contributorCountPromise`,
 * just previously split across two components.
 */
export function ProfileCommunityMetrics({
  github,
  community,
  contributorCountPromise,
  commitActivityPromise,
  githubRepo,
  githubConfigured,
  sources,
  communityLinkCount,
  communityLinkTotal,
}: ProfileCommunityMetricsProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const issuesAvailable = github.available && github.openIssues !== null;
  const releaseAvailable = github.available && github.latestReleaseTag !== null;
  const contributorsCheckable = github.available && Boolean(github.fullName);
  const developerActivityAvailable = starsAvailable || forksAvailable || issuesAvailable || releaseAvailable;
  const docsConfigured = Boolean(community.socials.docs);
  const hasAnyRealSignal = developerActivityAvailable || contributorsCheckable || docsConfigured || githubConfigured || communityLinkCount > 0;
  // PR-074 — names the actual cause (rate limit, 404, timeout, etc.) via the
  // same `describeUnavailable` humanizer the Evidence & Sources panel already
  // uses on this exact field — reading `sources.github.detail` raw would
  // leak the technical `ProviderHttpError` string verbatim (confirmed live:
  // "github request failed: 403 https://api.github.com/repos/...").
  const githubUnavailableReason = githubConfigured
    ? sources.github.status === "unavailable"
      ? describeUnavailable(sources.github.detail, "github")
      : (sources.github.detail ?? "GitHub returned no data for it just now.")
    : "This project has no GitHub repository configured in the Base Radar registry.";

  return (
    <ProfileSectionCard
      id="intelligence"
      title="Project Intelligence"
      icon={Users}
      sourceLink={github.available && github.fullName ? { href: `https://github.com/${github.fullName}`, label: "GitHub" } : undefined}
    >
      {hasAnyRealSignal ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <CommunityMetricTile icon={Link2} label="Community Channels">
            <AvailableValue>
              {communityLinkCount} of {communityLinkTotal}
            </AvailableValue>
            <span className="text-[10.5px] leading-snug text-radar-light-muted dark:text-radar-muted">
              Official links configured in the registry.
            </span>
          </CommunityMetricTile>

          <CommunityMetricTile icon={BookOpen} label="Documentation">
            {docsConfigured ? (
              <AvailableValue>Configured</AvailableValue>
            ) : (
              <NotCurrentlyAvailable reason="No documentation link is configured for this project in the Base Radar registry." />
            )}
          </CommunityMetricTile>

          <CommunityMetricTile icon={Users} label="GitHub Contributors">
            {contributorsCheckable ? (
              <Suspense
                fallback={
                  <span className="text-sm font-bold text-radar-light-muted dark:text-radar-muted" data-loading-skeleton="true">
                    Loading…
                  </span>
                }
              >
                <ProfileContributorsAsync resultPromise={contributorCountPromise} />
              </Suspense>
            ) : (
              <NotCurrentlyAvailable reason={githubUnavailableReason} />
            )}
          </CommunityMetricTile>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Community metrics are not currently available for this project"
          description="This project has no GitHub repository or documentation link configured in the Base Radar registry. When supported, this section will include GitHub activity, documentation status, and community growth as real links are added."
          className="bg-radar-light-surface/60 dark:bg-white/[0.02]"
        />
      )}

      {/* PR-079 — Engineering Health evidence, merged in from `ProfileMetrics.tsx`. */}
      {developerActivityAvailable ? (
        <>
          {github.stale && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-radar-warning/30 bg-radar-warning/10 px-2.5 py-1.5 text-[11px] font-medium text-radar-warning">
              <span className="uppercase tracking-wide">Stale</span>
              <span className="text-radar-light-muted dark:text-radar-muted">
                — GitHub Rate Limited. Showing data from{" "}
                {github.dataFetchedAt ? <RelativeTime iso={github.dataFetchedAt} /> : "an earlier fetch"}.
              </span>
            </div>
          )}
          <div className={DEVELOPER_METRIC_GRID_CLASS}>
            <MetricItem emphasize label="GitHub Stars" value={starsAvailable ? formatCompactNumber(github.stars as number) : undefined} unavailable={!starsAvailable} infoTooltip={GITHUB_STARS_INFO_TOOLTIP} />
            <MetricItem emphasize label="Forks" value={forksAvailable ? formatNumber(github.forks as number) : undefined} unavailable={!forksAvailable} />
            <MetricItem emphasize label="Open Issues" value={issuesAvailable ? formatNumber(github.openIssues as number) : undefined} unavailable={!issuesAvailable} />
            <Suspense
              fallback={
                <MetricItemSkeleton
                  emphasize
                  className="rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"
                />
              }
            >
              <ProfileCommitsAsync resultPromise={commitActivityPromise} />
            </Suspense>
          </div>

          {(releaseAvailable || github.language || github.license || github.createdAt || github.pushedAt) && (
            <div className={REPO_METADATA_GRID_CLASS}>
              {releaseAvailable && <MetricItem label="Latest Release" value={github.latestReleaseTag as string} />}
              {github.language && <MetricItem label="Language" value={github.language} />}
              {github.license && <MetricItem label="License" value={github.license} />}
              {github.pushedAt && <MetricItemRelativeTime label="Last Push" iso={github.pushedAt} />}
              {github.createdAt && <MetricItem label="Repo Age" value={formatDate(github.createdAt)} />}
            </div>
          )}
        </>
      ) : githubConfigured && githubRepo ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-radar-light-border p-3 dark:border-white/10">
          <GitBranch className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
              <span className="font-medium text-radar-light-text dark:text-radar-white">Developer Snapshot — </span>
              Live stars, commits, and release stats aren&apos;t available right now ({githubUnavailableReason}), but a
              repository is linked and will populate here automatically.
            </p>
            <a
              href={githubRepo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs font-medium text-radar-primary outline-none transition-colors hover:underline focus-visible:underline dark:text-radar-accent"
            >
              {githubRepo.owner}
              {githubRepo.repo ? `/${githubRepo.repo}` : ""}
              <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-radar-light-border p-3 dark:border-white/10">
          <GitBranch className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
            <span className="font-medium text-radar-light-text dark:text-radar-white">Repository not linked — </span>
            This project has no GitHub repository configured in the Base Radar registry yet. Engineering health will
            populate automatically once one is added.
          </p>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-radar-light-border p-3 dark:border-white/10">
        <Info className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          <span className="font-medium text-radar-light-text dark:text-radar-white">Not yet tracked:</span> X (Twitter)
          followers, Discord members, and Telegram members aren&apos;t available — X&apos;s follower-count API requires paid
          access, and Discord/Telegram member counts require bot-level access to each project&apos;s own server that this app
          doesn&apos;t have. Reddit and Medium have no provider integrated into Base Radar at all yet.
        </p>
      </div>
    </ProfileSectionCard>
  );
}
