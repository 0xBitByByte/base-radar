/**
 * PR-074 REVIEW #2 — "Top Activity" ("Most Starred") ranks by real GitHub
 * stars (see `viewMeta.ts`'s `topActivity` entry for why, not commit
 * activity). GitHub's rate limit is shared across every visitor and easy to
 * exhaust (60 req/hr unauthenticated) — when that happens, `engineering
 * .available` is false for every project simultaneously, and the leaderboard
 * this route shows has zero qualifying projects. The reviewer's explicit
 * instruction: "Never waste an entire section because one provider failed."
 * This renders real, already-computed alternate rankings (TVL, Volume,
 * Market Cap, Movers — none of which depend on GitHub) instead of the
 * generic empty state, with an honest banner explaining why GitHub-ranked
 * results aren't shown right now.
 */

import { AlertTriangle, BarChart3, Coins, Landmark, TrendingUpDown } from "lucide-react";

import { ProjectRail } from "@/components/projects/ProjectRail";
import { PROJECTS_PATH } from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { getRateLimitStatus as getGithubRateLimitStatus } from "@/lib/providers/github/service";
import type { ProjectsLeaderboards } from "@/components/projects/loadProjectsData";

function githubUnavailableReason(): string {
  const snapshot = getGithubRateLimitStatus();
  if (!snapshot || snapshot.remaining > 0) {
    return "GitHub returned no star counts for any tracked repository just now.";
  }
  const minutesLeft = Math.max(0, Math.round((new Date(snapshot.resetAt).getTime() - Date.now()) / 60_000));
  const mode = snapshot.authenticated ? "authenticated" : "unauthenticated — no GITHUB_TOKEN configured";
  return `GitHub's public API is rate limited right now (${snapshot.remaining}/${snapshot.limit} requests remaining, ${mode}). Resets in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
}

export function TopActivityFallback({ leaderboards }: { leaderboards: ProjectsLeaderboards }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-3 rounded-2xl border border-radar-warning/30 bg-radar-warning/5 p-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-radar-warning" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
            No projects currently qualify for GitHub-star ranking
          </p>
          <p className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
            {githubUnavailableReason()} Showing real rankings by other tracked metrics instead — nothing here is
            fabricated or estimated.
          </p>
        </div>
      </div>

      <ProjectRail
        title="Top TVL"
        description={PROJECTS_VIEW_META.topTvl.description}
        icon={Landmark}
        accent="primary"
        projects={leaderboards.topTvl}
        maxCards={6}
        emptyTitle={PROJECTS_VIEW_META.topTvl.emptyTitle}
        emptyDescription={PROJECTS_VIEW_META.topTvl.emptyDescription}
        viewAllHref={`${PROJECTS_PATH}/${PROJECTS_VIEW_META.topTvl.slug}`}
      />
      <ProjectRail
        title="Top Volume"
        description={PROJECTS_VIEW_META.topVolume.description}
        icon={BarChart3}
        accent="primary"
        projects={leaderboards.topVolume}
        maxCards={6}
        emptyTitle={PROJECTS_VIEW_META.topVolume.emptyTitle}
        emptyDescription={PROJECTS_VIEW_META.topVolume.emptyDescription}
        viewAllHref={`${PROJECTS_PATH}/${PROJECTS_VIEW_META.topVolume.slug}`}
      />
      <ProjectRail
        title="Top Market Cap"
        description="Ranked by real, tracked market capitalization."
        icon={Coins}
        accent="accent"
        projects={leaderboards.topMarketCap}
        maxCards={6}
        emptyTitle="No projects with a tracked market cap yet"
        emptyDescription="Market cap appears here once CoinGecko resolves a real listing."
      />
      <ProjectRail
        title="Top Movers"
        description="Ranked by the largest real 24h price move, up or down."
        icon={TrendingUpDown}
        accent="orange"
        projects={leaderboards.topMovers}
        maxCards={6}
        emptyTitle="No projects with a tracked 24h price move yet"
        emptyDescription="Movers appear here once a real 24h price change is available."
      />
    </div>
  );
}
