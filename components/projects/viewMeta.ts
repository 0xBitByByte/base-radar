/**
 * PR-061 — the one metadata dictionary for every non-"all" `ProjectsView`:
 * title, "why these projects belong here" explanation, icon, accent, empty
 * copy, and its dedicated URL slug. Previously this lived as a private
 * `RAIL_META` constant inside `app/dashboard/projects/page.tsx` — pulled out
 * here so the new dedicated collection routes (Task 2/7) can share the exact
 * same copy the curated rails already use, rather than a second, drifting
 * definition. No new facts are introduced — every `description`/
 * `emptyTitle`/`emptyDescription` string below is unchanged from PR-059's
 * `RAIL_META`, just relocated and given a real URL slug alongside it.
 */

import type { Metadata } from "next";
import { AlertTriangle, BadgeCheck, BarChart3, Compass, Flame, Gem, GitBranch, Landmark, RefreshCw, Sparkles, Zap, type LucideIcon } from "lucide-react";

import type { ProjectsView } from "@/components/projects/queryState";

export type RailAccent = "primary" | "success" | "purple" | "orange" | "danger" | "accent";

export type ProjectsViewMeta = {
  /** Dedicated route this view lives at — `/dashboard/projects/{slug}` (Task 2 & 7). */
  slug: string;
  title: string;
  /** Rail subtitle AND the dedicated page's "why these projects belong here" copy — one string, one source of truth. */
  description?: string;
  icon: LucideIcon;
  accent: RailAccent;
  /** Curated-rail render cap; unused by the dedicated collection pages themselves (those paginate the full set). */
  maxCards: number;
  emptyTitle: string;
  emptyDescription: string;
};

export const PROJECTS_VIEW_META: Record<Exclude<ProjectsView, "all">, ProjectsViewMeta> = {
  verified: {
    slug: "verified",
    title: "Verified Projects",
    description: "Editorially verified, or confirmed via Discovery — the ecosystem's most trusted entries.",
    icon: BadgeCheck,
    accent: "success",
    maxCards: 12,
    emptyTitle: "No verified projects yet",
    emptyDescription: "Verification happens through manual registry review — check back as the registry grows.",
  },
  trending: {
    slug: "trending",
    title: "Trending",
    description: "Strong 24h price moves, or agreement across multiple discovery sources.",
    icon: Flame,
    accent: "orange",
    maxCards: 10,
    emptyTitle: "Nothing is trending right now",
    emptyDescription: "Trending needs either a large 24h price move or agreement from more than one discovery source.",
  },
  new: {
    slug: "new",
    title: "New Projects",
    description: "Surfaced by this run's Discovery pipeline — the newest entries in the registry.",
    icon: Sparkles,
    accent: "accent",
    maxCards: 12,
    emptyTitle: "Nothing new since the last discovery run",
    emptyDescription: "New projects appear here as soon as Discovery surfaces one with real corroborating evidence.",
  },
  topTvl: {
    slug: "top-tvl",
    title: "Top TVL",
    description: "Ranked by real, tracked Total Value Locked — where the capital is right now.",
    icon: Landmark,
    accent: "primary",
    maxCards: 10,
    emptyTitle: "No projects with tracked TVL yet",
    emptyDescription: "TVL appears here once DefiLlama resolves a real protocol match.",
  },
  topVolume: {
    slug: "top-volume",
    title: "Top Volume",
    description: "Ranked by real 24h trading volume — where trading activity is concentrated.",
    icon: BarChart3,
    accent: "primary",
    maxCards: 10,
    emptyTitle: "No projects with tracked trading volume yet",
    emptyDescription: "Volume appears here once a real DEX pair or market listing resolves.",
  },
  topActivity: {
    slug: "fast-growing",
    title: "Most Starred",
    // PR-074 — was "ranked by real commits in the last 7 days," which this
    // codebase's list-wide computation (`getAllProjectIntelligence`) never
    // actually fetches for any project — commit history is a genuinely slow
    // GitHub endpoint, deliberately fetched only for the single Project
    // Profile page's streamed/extended path, never across the full ~1,000-
    // project catalog (that would mean ~1,000 extra GitHub calls on every
    // list-page load). Ranking by commits therefore always returned "no
    // qualifying project" — confirmed live, not a display bug. Re-ranked by
    // GitHub stars, the one engineering signal this catalog's fast path
    // already has for every project with a linked repository.
    description: "Ranked by GitHub stars — the clearest engineering-popularity signal available across the full tracked catalog. (Commit-velocity ranking would require fetching commit history for every tracked project on every page load, which isn't done at catalog scale — see a single project's own Engineering Health section for its real recent commit activity.)",
    icon: GitBranch,
    accent: "purple",
    maxCards: 10,
    emptyTitle: "No projects with a starred GitHub repository yet",
    emptyDescription: "This appears here once a project's linked repository reports real GitHub stars.",
  },
  needsReview: {
    slug: "needs-review",
    title: "Needs Review",
    description: "Low-confidence or unresolved Discovery matches — flagged for manual analyst review, worst-evidenced first.",
    icon: AlertTriangle,
    accent: "danger",
    maxCards: 10,
    emptyTitle: "Nothing needs review right now",
    emptyDescription: "Low-confidence and unresolved Discovery matches will appear here.",
  },
  recentlyDiscovered: {
    slug: "recently-discovered",
    title: "Recently Discovered",
    description: "Surfaced by the most recent Discovery pipeline run, not a longer history.",
    icon: Compass,
    accent: "purple",
    maxCards: 10,
    emptyTitle: "No projects were surfaced by the last discovery run",
    emptyDescription: "This reflects the most recent Discovery pipeline run, not a longer history.",
  },
  recentlyUpdated: {
    slug: "recently-updated",
    title: "Recently Updated",
    description: "Tracked registry projects whose entry was genuinely edited in the last 30 days.",
    icon: RefreshCw,
    accent: "accent",
    maxCards: 10,
    emptyTitle: "No recently updated projects",
    // PR-074 REVIEW #3 — confirmed via `grep -rl updatedAt data/projects/seed/*.ts`
    // (zero matches): this is empty because no registry project has ever
    // had its real `lifecycle.updatedAt` timestamp set, not a bug. Named
    // explicitly rather than a vague "check back later," per review.
    emptyDescription: "None of the registry's tracked projects currently have a recorded last-edited date. This appears the moment a project's registry entry is genuinely updated.",
  },
  blueChips: {
    slug: "blue-chips",
    title: "Blue Chips",
    description: "Verified projects with more than $100M in tracked TVL — the ecosystem's most established capital.",
    icon: Gem,
    accent: "success",
    maxCards: 12,
    emptyTitle: "No Blue Chips yet",
    emptyDescription: "Blue Chips need both editorial verification and more than $100M in tracked TVL — check back as coverage grows.",
  },
  emerging: {
    slug: "emerging",
    title: "Emerging",
    description: "Recently discovered projects with high-confidence evidence — surfaced before they're widely known.",
    icon: Zap,
    accent: "orange",
    maxCards: 12,
    emptyTitle: "Nothing Emerging right now",
    emptyDescription: "Emerging needs a project surfaced by the latest discovery run with high-confidence evidence.",
  },
};

/** Reverse lookup — the dedicated route's `[folder]` segment back to its `ProjectsView`. `notFound()`s the caller if the slug isn't real, rather than guessing. */
export function viewForSlug(slug: string): Exclude<ProjectsView, "all"> | null {
  const entry = (Object.entries(PROJECTS_VIEW_META) as [Exclude<ProjectsView, "all">, ProjectsViewMeta][]).find(
    ([, meta]) => meta.slug === slug
  );
  return entry ? entry[0] : null;
}

/**
 * The one place title/description/canonical is derived for a curated
 * collection route — every `app/dashboard/projects/{slug}/page.tsx` calls
 * this instead of duplicating the same three-line `Metadata` object 11
 * times. Canonical matters here specifically because these routes carry
 * search/sort/filter query-param state (`renderProjectsCollectionRoute`);
 * without it, `?search=...`/`?sort=...` variants would each look like a
 * distinct, duplicate page to a crawler.
 */
export function buildViewMetadata(view: Exclude<ProjectsView, "all">): Metadata {
  const meta = PROJECTS_VIEW_META[view];
  return {
    title: `${meta.title} | Projects`,
    description: meta.description ?? meta.title,
    alternates: { canonical: `/dashboard/projects/${meta.slug}` },
  };
}
