import { Suspense } from "react";
import { BookOpen, GitFork, Info, Star, Users, type LucideIcon } from "lucide-react";

import { ProfileContributorsAsync } from "@/components/explorer/ProfileContributorsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactNumber } from "@/lib/data/format";
import type { Community, GithubIntel } from "@/lib/intelligence/types";
import type { ContributorCount } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileCommunityMetricsProps = {
  github: GithubIntel;
  community: Community;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
  /** Real registry-level signal (`Boolean(project.github)`) — distinct from `github.available`, which is also `false` when a *configured* repo's live fetch fails (rate limit, network error). Lets each tile's reason say the accurate thing instead of always blaming "no repository configured." */
  githubConfigured: boolean;
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
 * PR13.7 Goal 2 — the Project Profile's Community Metrics, expanded from
 * PR13.6's GitHub-only stat row into the full 9-metric list the spec names.
 * Every provider this codebase actually integrates was checked before any
 * "Not Currently Available" was written here: GitHub Stars/Forks/
 * Contributors are real (Contributors is a new call, `github.getContributorCount`,
 * extended/Profile-page-only — see `page.tsx`'s `contributorCountPromise`);
 * Documentation Status is a real, zero-fetch registry-presence check. X's
 * follower-count API requires paid v2 access (out of scope per this PR's own
 * "no paid APIs" rule); Discord/Telegram member counts require bot-level
 * access to each project's own server/channel, which this app has never had
 * for any third-party community; Reddit and Medium have no provider
 * integrated at all (not in the six-source Provider Layer this codebase
 * maintains).
 *
 * PR-050 final pass — split into two tiers instead of nine identical-size
 * tiles: the four metrics that genuinely vary per project (Stars/Forks/
 * Contributors/Documentation) stay full-size tiles; the five that are
 * permanently unavailable for every project in the registry (no per-project
 * signal — X/Discord/Telegram/Reddit/Medium have no provider integrated at
 * all) collapse into a single informational paragraph beneath, not five
 * repeated placeholder rows, so the section reads as "here's what's not
 * covered yet and why" once, rather than restating the same shape of
 * absence five times. When even the four real tiles have nothing to show
 * (no GitHub repo, no docs link), the tile grid itself is replaced with one
 * explanatory panel rather than four separate "Not Currently Available"
 * cards saying the same thing four times.
 */
export function ProfileCommunityMetrics({ github, community, contributorCountPromise, githubConfigured }: ProfileCommunityMetricsProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const contributorsCheckable = github.available && Boolean(github.fullName);
  const docsConfigured = Boolean(community.socials.docs);
  const hasAnyRealSignal = starsAvailable || forksAvailable || contributorsCheckable || docsConfigured || githubConfigured;
  const githubUnavailableReason = githubConfigured
    ? "This project's GitHub repository is configured, but GitHub returned no data for it just now."
    : "This project has no GitHub repository configured in the Base Radar registry.";

  return (
    <ProfileSectionCard id="community" title="Community Metrics" icon={Users}>
      {hasAnyRealSignal ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <CommunityMetricTile icon={Star} label="GitHub Stars">
            {starsAvailable ? (
              <AvailableValue>{formatCompactNumber(github.stars as number)}</AvailableValue>
            ) : (
              <NotCurrentlyAvailable reason={githubUnavailableReason} />
            )}
          </CommunityMetricTile>

          <CommunityMetricTile icon={GitFork} label="GitHub Forks">
            {forksAvailable ? (
              <AvailableValue>{formatCompactNumber(github.forks as number)}</AvailableValue>
            ) : (
              <NotCurrentlyAvailable reason={githubUnavailableReason} />
            )}
          </CommunityMetricTile>

          <CommunityMetricTile icon={Users} label="GitHub Contributors">
            {contributorsCheckable ? (
              <Suspense
                fallback={<span className="text-sm font-bold text-radar-light-muted dark:text-radar-muted">Loading…</span>}
              >
                <ProfileContributorsAsync resultPromise={contributorCountPromise} />
              </Suspense>
            ) : (
              <NotCurrentlyAvailable reason={githubUnavailableReason} />
            )}
          </CommunityMetricTile>

          <CommunityMetricTile icon={BookOpen} label="Documentation">
            {docsConfigured ? (
              <AvailableValue>Configured</AvailableValue>
            ) : (
              <NotCurrentlyAvailable reason="No documentation link is configured for this project in the Base Radar registry." />
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
