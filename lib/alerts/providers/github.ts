/**
 * GitHub Alert Provider — reuses the existing GitHub provider layer
 * (`lib/providers/github/service.ts`) exactly as every other consumer
 * does (same cache TTL, same rate-limit budget); never calls `fetch`
 * directly. Pure: no React, no hooks, no localStorage.
 *
 * Every alert type below is derived from a SINGLE snapshot of already-
 * fetched data (recency of a timestamp, or a currently-true boolean like
 * `archived`) — never from a persisted history of prior fetches, since a
 * provider must stay stateless. Repeat fetches of an unchanged real fact
 * (e.g. a repo that's still archived) regenerate the same alert `id`
 * every time; `lib/alerts/service.ts`'s existing overlay/dismiss
 * mechanism is what keeps that from re-surfacing as unread once a user
 * has already seen and dismissed it — a provider never needs its own
 * memory of "have I already alerted this."
 *
 * Deliberately NOT implemented, and not guessed: Repository Public,
 * Repository Renamed, Stars/Fork milestones, Issue/PR spikes, Contributor
 * increase, Security Advisory. Each would require either a persisted
 * historical baseline (which providers must not keep) or an unverified
 * new endpoint — rather than fabricate a "just happened" claim from a
 * single snapshot, these are omitted entirely. See the PR15.2 report for
 * the full reasoning.
 */

import { getProjects } from "@/data/projects";
import type { Project } from "@/data/projects/types";
import { isWithinDays, makeAlertId } from "@/lib/alerts/providers/shared";
import type { AlertProvider } from "@/lib/alerts/providers/types";
import type { Alert } from "@/lib/alerts/types";
import * as github from "@/lib/providers/github/service";
import type { CommitActivity, RepoStats } from "@/lib/providers/github/service";

const RECENT_RELEASE_WINDOW_DAYS = 14;

const MAJOR_RELEASE_PATTERN = /^v?\d+\.0\.0$/i;
const RELEASE_CANDIDATE_PATTERN = /(rc|beta|alpha|preview|pre)\d*$/i;

function repoFullName(project: Project): string | null {
  if (!project.github?.repo) return null;
  return `${project.github.owner}/${project.github.repo}`;
}

function buildReleaseAlert(project: Project, stats: RepoStats): Alert | null {
  if (!stats.latestReleaseTag || !stats.latestReleasePublishedAt) return null;
  if (!isWithinDays(stats.latestReleasePublishedAt, RECENT_RELEASE_WINDOW_DAYS)) return null;

  const tag = stats.latestReleaseTag;
  const detail = stats.latestReleaseNoteSummary ?? "New version published on GitHub.";

  if (MAJOR_RELEASE_PATTERN.test(tag)) {
    return {
      id: makeAlertId("github", "major-release", project.id, tag),
      projectId: project.id,
      projectName: project.name,
      title: `Major Release: ${tag}`,
      summary: detail,
      category: "release",
      severity: "success",
      timestamp: stats.latestReleasePublishedAt,
      read: false,
      pinned: false,
      source: "GitHub",
      actionUrl: `/dashboard/projects/${project.slug}`,
    };
  }

  if (RELEASE_CANDIDATE_PATTERN.test(tag)) {
    return {
      id: makeAlertId("github", "release-candidate", project.id, tag),
      projectId: project.id,
      projectName: project.name,
      title: `Release Candidate: ${tag}`,
      summary: detail,
      category: "release",
      severity: "info",
      timestamp: stats.latestReleasePublishedAt,
      read: false,
      pinned: false,
      source: "GitHub",
      actionUrl: `/dashboard/projects/${project.slug}`,
    };
  }

  return {
    id: makeAlertId("github", "release", project.id, tag),
    projectId: project.id,
    projectName: project.name,
    title: `New Release: ${tag}`,
    summary: detail,
    category: "release",
    severity: "info",
    timestamp: stats.latestReleasePublishedAt,
    read: false,
    pinned: false,
    source: "GitHub",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

function buildArchivedAlert(project: Project, stats: RepoStats): Alert | null {
  if (!stats.archived) return null;
  return {
    id: makeAlertId("github", "archived", project.id),
    projectId: project.id,
    projectName: project.name,
    title: "Repository Archived",
    summary: `${project.name}'s GitHub repository is now read-only (archived).`,
    category: "security",
    severity: "warning",
    // No real "archived at" timestamp is exposed by GitHub's repo endpoint —
    // `pushedAt` (the repo's last real activity before archival) is the
    // most honest timestamp available, never a fabricated "just now."
    timestamp: stats.pushedAt,
    read: false,
    pinned: false,
    source: "GitHub",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

function buildActivityAlert(project: Project, activity: CommitActivity): Alert | null {
  if (activity.commitsLast7d <= 0) return null;
  // Only surface this as a genuine signal when it's a real upswing, not
  // every week that merely has some commits — otherwise this would fire
  // for nearly every actively maintained repo, every single fetch.
  if (activity.trendPct === null || activity.trendPct < 50) return null;

  return {
    id: makeAlertId("github", "activity", project.id, String(activity.commitsLast7d)),
    projectId: project.id,
    projectName: project.name,
    title: "Increased Development Activity",
    summary: `${activity.commitsLast7d} commit${activity.commitsLast7d === 1 ? "" : "s"} in the last 7 days, up from ${activity.commitsPrev7d} the week before.`,
    category: "release",
    severity: "info",
    timestamp: new Date().toISOString(),
    read: false,
    pinned: false,
    source: "GitHub",
    actionUrl: `/dashboard/projects/${project.slug}`,
  };
}

async function fetchAlertsForProject(project: Project): Promise<Alert[]> {
  const fullName = repoFullName(project);
  if (!fullName) return [];

  const [statsResult, activityResult] = await Promise.allSettled([
    github.getRepoStats(fullName),
    github.getCommitActivity(fullName),
  ]);

  const alerts: Alert[] = [];

  if (statsResult.status === "fulfilled" && statsResult.value.ok) {
    const stats = statsResult.value.data;
    const releaseAlert = buildReleaseAlert(project, stats);
    if (releaseAlert) alerts.push(releaseAlert);
    const archivedAlert = buildArchivedAlert(project, stats);
    if (archivedAlert) alerts.push(archivedAlert);
  }

  // A repo GitHub hasn't finished computing commit stats for yet
  // (`getCommitActivity` throwing "not ready") is a real, expected,
  // non-error outcome — see `github/client.ts` — so this branch is simply
  // skipped, never treated as a failure worth logging.
  if (activityResult.status === "fulfilled" && activityResult.value.ok) {
    const activityAlert = buildActivityAlert(project, activityResult.value.data);
    if (activityAlert) alerts.push(activityAlert);
  }

  return alerts;
}

export const githubAlertProvider: AlertProvider = {
  async fetchAlerts(): Promise<Alert[]> {
    const withRepo = getProjects().filter((project) => repoFullName(project) !== null);
    const results = await Promise.allSettled(withRepo.map(fetchAlertsForProject));
    return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  },
};
