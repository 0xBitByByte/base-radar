import { Suspense } from "react";
import { BookOpen, FileText, GitFork, MessageCircle, Send, Star, Users, type LucideIcon } from "lucide-react";

import { ProfileContributorsAsync } from "@/components/explorer/ProfileContributorsAsync";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { formatCompactNumber } from "@/lib/data/format";
import type { Community, GithubIntel } from "@/lib/intelligence/types";
import type { ContributorCount } from "@/lib/providers/github/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileCommunityMetricsProps = {
  github: GithubIntel;
  community: Community;
  contributorCountPromise: Promise<ProviderResult<ContributorCount> | null>;
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
 * maintains). Every unavailable slot still renders, with its specific real
 * reason — Goal 2 explicitly wants all nine slots visible, never hidden.
 */
export function ProfileCommunityMetrics({ github, community, contributorCountPromise }: ProfileCommunityMetricsProps) {
  const starsAvailable = github.available && github.stars !== null;
  const forksAvailable = github.available && github.forks !== null;
  const docsConfigured = Boolean(community.socials.docs);

  return (
    <ProfileSectionCard id="community" title="Community Metrics" icon={Users}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <CommunityMetricTile icon={Star} label="GitHub Stars">
          {starsAvailable ? (
            <AvailableValue>{formatCompactNumber(github.stars as number)}</AvailableValue>
          ) : (
            <NotCurrentlyAvailable reason="This project has no GitHub repository configured in the Base Radar registry." />
          )}
        </CommunityMetricTile>

        <CommunityMetricTile icon={GitFork} label="GitHub Forks">
          {forksAvailable ? (
            <AvailableValue>{formatCompactNumber(github.forks as number)}</AvailableValue>
          ) : (
            <NotCurrentlyAvailable reason="This project has no GitHub repository configured in the Base Radar registry." />
          )}
        </CommunityMetricTile>

        <CommunityMetricTile icon={Users} label="GitHub Contributors">
          {github.available && github.fullName ? (
            <Suspense
              fallback={<span className="text-sm font-bold text-radar-light-muted dark:text-radar-muted">Loading…</span>}
            >
              <ProfileContributorsAsync resultPromise={contributorCountPromise} />
            </Suspense>
          ) : (
            <NotCurrentlyAvailable reason="This project has no GitHub repository configured in the Base Radar registry." />
          )}
        </CommunityMetricTile>

        <CommunityMetricTile icon={BookOpen} label="Documentation">
          {docsConfigured ? (
            <AvailableValue>Configured</AvailableValue>
          ) : (
            <NotCurrentlyAvailable reason="No documentation link is configured for this project in the Base Radar registry." />
          )}
        </CommunityMetricTile>

        <CommunityMetricTile icon={MessageCircle} label="X (Twitter) Followers">
          <NotCurrentlyAvailable reason="X's follower-count API requires paid access — not available on the free tier this app uses." />
        </CommunityMetricTile>

        <CommunityMetricTile icon={MessageCircle} label="Discord Members">
          <NotCurrentlyAvailable reason="Reading a server's member count requires a bot already joined to that specific Discord server, which this app doesn't have." />
        </CommunityMetricTile>

        <CommunityMetricTile icon={Send} label="Telegram Members">
          <NotCurrentlyAvailable reason="Telegram doesn't expose member counts for public groups without bot access to that specific group." />
        </CommunityMetricTile>

        <CommunityMetricTile icon={MessageCircle} label="Reddit Members">
          <NotCurrentlyAvailable reason="No Reddit provider is integrated into Base Radar." />
        </CommunityMetricTile>

        <CommunityMetricTile icon={FileText} label="Medium Articles">
          <NotCurrentlyAvailable reason="No Medium provider is integrated into Base Radar." />
        </CommunityMetricTile>
      </div>
    </ProfileSectionCard>
  );
}
