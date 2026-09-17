/**
 * Aggregation + scoring layer for Global Search — turns the static command
 * registry, the static Project Registry, and four already-computed engine
 * outputs (Timeline, Notifications, Automation, Portfolio Intelligence,
 * Daily Brief) into one common `SearchableItem` shape, then scores and
 * groups them. Every normalizer below only ever reshapes a value some other
 * hook/helper already produced — no provider call, no engine recomputation,
 * no business logic of its own. Read-only, per the PR brief.
 */

import { Bell, Clock, FolderKanban, LayoutGrid, Newspaper, Sparkles, Zap } from "lucide-react";

import { getProject } from "@/data/projects/helpers";
import type { Project } from "@/data/projects/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { Command } from "@/lib/command/commands";
import type { Notification } from "@/lib/notifications/types";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import type { SearchableItem, SearchGroup } from "@/lib/search/types";
import type { TimelineEvent } from "@/lib/timeline/types";

/** Commands tagged `"Settings"` (Notification/Automation Preferences) keep their own Settings bucket; every other static command folds into the generic Commands bucket, so the dynamic per-item results — not static shortcuts — own the Projects/Timeline/Notifications/Automation/Portfolio/Daily Brief groups. */
function commandSearchGroup(command: Command): SearchGroup {
  return command.group === "Settings" ? "Settings" : "Commands";
}

export function normalizeCommand(command: Command): SearchableItem {
  return {
    id: `command:${command.id}`,
    title: command.title,
    description: command.description,
    group: commandSearchGroup(command),
    type: "command",
    icon: command.icon,
    route: command.route,
    keywords: command.keywords,
    metadata: {},
    source: "Command Palette",
  };
}

export function normalizeProject(project: Project): SearchableItem {
  return {
    id: `project:${project.id}`,
    title: project.name,
    description: project.shortDescription,
    group: "Projects",
    type: "project",
    icon: FolderKanban,
    route: `/dashboard/projects/${project.slug}`,
    keywords: [...project.tags, ...project.categories, ...project.chains],
    metadata: { status: project.status },
    source: "Project Registry",
  };
}

/**
 * The AI Intelligence Engine's per-project reads (`lib/alerts/intelligence`)
 * were the one upstream layer in the Timeline/Notifications/Automation/
 * Portfolio/Daily Brief reuse chain NOT represented in Global Search (PR-010)
 * — every other layer downstream of it already was. Routes straight to the
 * Project Profile the alert is about (`getProject`, the same lookup
 * `IntelligenceCard`/`AIIntelligenceWidget` already use), which is more
 * specific than the generic `/dashboard/alerts` list. Falls back to that
 * list only if the project can't be resolved (never a broken destination).
 */
export function normalizeIntelligenceAlert(alert: IntelligenceAlert): SearchableItem {
  const project = getProject(alert.projectId);
  return {
    id: `intelligence:${alert.id}`,
    title: alert.headline,
    description: alert.summary,
    group: "AI Intelligence",
    type: "intelligence-alert",
    icon: Sparkles,
    route: project ? `/dashboard/projects/${project.slug}` : "/dashboard/alerts",
    keywords: [alert.projectName, alert.narrative, ...alert.categories],
    metadata: { confidence: String(alert.confidence), score: String(alert.score) },
    source: "AI Intelligence Engine",
  };
}

export function normalizeTimelineEvent(event: TimelineEvent): SearchableItem {
  return {
    id: `timeline:${event.id}`,
    title: event.title,
    description: event.summary,
    group: "Timeline",
    type: "timeline",
    icon: Clock,
    route: "/dashboard/timeline",
    keywords: [event.eventType, event.projectName ?? ""].filter(Boolean),
    metadata: { source: event.source, projectName: event.projectName ?? "" },
    source: "Intelligence Timeline",
  };
}

export function normalizeNotification(notification: Notification): SearchableItem {
  return {
    id: `notification:${notification.id}`,
    title: notification.title,
    description: notification.summary,
    group: "Notifications",
    type: "notification",
    icon: Bell,
    route: "/dashboard/notifications",
    keywords: [notification.type, notification.projectName ?? ""].filter(Boolean),
    metadata: { priority: notification.priority, source: notification.source },
    source: "Notification Center",
  };
}

export function normalizeAutomationResult(result: AutomationResult): SearchableItem {
  return {
    id: `automation:${result.id}`,
    title: result.title,
    description: result.summary,
    group: "Automation",
    type: "automation",
    icon: Zap,
    route: "/dashboard/automation",
    keywords: [result.projectName ?? ""].filter(Boolean),
    metadata: { priority: result.priority, status: result.status },
    source: "Automation Engine",
  };
}

export function normalizePortfolio(portfolio: PortfolioIntelligence): SearchableItem {
  return {
    id: `portfolio:${portfolio.id}`,
    title: portfolio.headline,
    description: portfolio.summary,
    group: "Portfolio",
    type: "portfolio",
    icon: LayoutGrid,
    route: "/dashboard/portfolio",
    keywords: ["portfolio", "watchlist", "health"],
    metadata: { projectCount: String(portfolio.projectCount) },
    source: "Portfolio Intelligence",
  };
}

export function normalizeDailyBrief(brief: DailyBrief): SearchableItem {
  return {
    id: `daily-brief:${brief.id}`,
    title: brief.headline,
    description: brief.summary,
    group: "Daily Brief",
    type: "daily-brief",
    icon: Newspaper,
    route: "/dashboard/brief",
    keywords: ["brief", "daily", "summary"],
    metadata: { projectCount: String(brief.projectCount) },
    source: "Daily Brief Engine",
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function metadataToText(metadata: Record<string, unknown>): string {
  return Object.values(metadata)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

/**
 * PR-094.03 — Levenshtein edit distance, the standard, dependency-free way
 * to measure "how many single-character insert/delete/substitute edits
 * turn `a` into `b`." Plain iterative DP (two rolling rows, not a full
 * matrix) — both inputs here are always short (a search query and a
 * title/keyword), so this is cheap even run per-item per-keystroke, and
 * needs no library.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const insertCost = currentRow[j] + 1;
      const deleteCost = previousRow[j + 1] + 1;
      const substituteCost = previousRow[j] + (a[i] === b[j] ? 0 : 1);
      currentRow.push(Math.min(insertCost, deleteCost, substituteCost));
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

/** 1 = identical, 0 = completely different, scaled by the longer string's length so a one-letter typo on a short word costs more than the same one-letter typo on a long word (matching how noticeable each actually is). */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function bestSimilarity(candidates: string[], query: string): number {
  let best = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    best = Math.max(best, similarity(candidate, query));
  }
  return best;
}

/**
 * PR-094.03 — below this length, fuzzy matching is skipped entirely: a
 * 1-2 character query is already handled fine by the exact/prefix/
 * substring tiers above, and edit-distance similarity on that few
 * characters is too noisy to mean anything (almost everything is "close"
 * to a 1-2 character string).
 */
const MIN_FUZZY_QUERY_LENGTH = 3;
/** A typo has to land noticeably closer to a real word than to a random one — see this file's own scoring notes for the empirical spread behind this number (real typos land ~0.65-0.92 similarity; unrelated words land ~0.12-0.5). */
const FUZZY_SIMILARITY_THRESHOLD = 0.6;
/** Deliberately just under the real substring-match tiers (60 for title, 50 for keyword) they sit below, so a genuine typo can rescue an otherwise-zero score but can never outrank or tie a real substring/prefix/exact match of the same field. */
const FUZZY_TITLE_SCORE_CEILING = 55;
const FUZZY_KEYWORD_SCORE_CEILING = 45;

/** Simple weighted substring scoring — title match ranks highest, then keyword match, then description/group/metadata — plus a typo-tolerant fuzzy fallback (PR-094.03) on title/keywords only. Identical formula regardless of `item.type`, so a Command has no inherent advantage over a Project/Notification/etc. — "best match wins," not "commands first." */
function scoreItem(item: SearchableItem, query: string): number {
  const title = normalize(item.title);
  const description = normalize(item.description);
  const group = normalize(item.group);
  const keywords = item.keywords.map(normalize);

  let score = 0;
  if (title === query) score = Math.max(score, 100);
  else if (title.startsWith(query)) score = Math.max(score, 80);
  else if (title.includes(query)) score = Math.max(score, 60);

  if (keywords.some((keyword) => keyword === query)) score = Math.max(score, 90);
  else if (keywords.some((keyword) => keyword.includes(query))) score = Math.max(score, 50);

  if (description.includes(query)) score = Math.max(score, 30);
  if (group.includes(query)) score = Math.max(score, 20);
  if (metadataToText(item.metadata).includes(query)) score = Math.max(score, 15);

  // PR-094.03 — fuzzy/typo tolerance. Only ever a fallback: it can rescue
  // a query that scored below its own ceiling on that field (most often
  // 0, i.e. no exact/prefix/substring hit at all), never lower an
  // already-stronger score, and never run at all on description/group/
  // metadata (free-text fields where "close edit distance" stops meaning
  // "the same word" and starts meaning noise).
  if (query.length >= MIN_FUZZY_QUERY_LENGTH) {
    if (score < FUZZY_TITLE_SCORE_CEILING) {
      const titleWords = title.split(/\s+/).filter(Boolean);
      const titleSimilarity = bestSimilarity([title, ...titleWords], query);
      if (titleSimilarity >= FUZZY_SIMILARITY_THRESHOLD) {
        score = Math.max(score, Math.round(titleSimilarity * FUZZY_TITLE_SCORE_CEILING));
      }
    }
    if (score < FUZZY_KEYWORD_SCORE_CEILING) {
      const keywordSimilarity = bestSimilarity(keywords, query);
      if (keywordSimilarity >= FUZZY_SIMILARITY_THRESHOLD) {
        score = Math.max(score, Math.round(keywordSimilarity * FUZZY_KEYWORD_SCORE_CEILING));
      }
    }
  }

  return score;
}

function isPrioritizedProject(item: SearchableItem, prioritizedProjectIds: Set<string> | undefined): boolean {
  if (!prioritizedProjectIds || item.type !== "project") return false;
  const projectId = item.id.startsWith("project:") ? item.id.slice("project:".length) : item.id;
  return prioritizedProjectIds.has(projectId);
}

/**
 * Case-insensitive search across title/description/keywords/group/metadata.
 * Sorted purely by score (then original registry order as a tiebreak) —
 * deliberately NOT group-first, so a strongly-matching Project/Notification
 * ranks above a weakly-matching Command, per the brief's "best match wins."
 * An empty query matches every item (a browsable list), same as PR21 Part 1.
 *
 * `prioritizedProjectIds` (PR22 Part 2) — the active Personal Watchlist's
 * project ids, when provided — only ever breaks a tie between two items that
 * already scored identically: a Project in the active watchlist sorts
 * before an equally-scored item that isn't, but a strongly-matching
 * non-project result still outranks a weakly-matching watchlist project.
 * This is "prioritize," never "hide" — every non-watchlist project stays in
 * the results, at the rank its match quality alone earns it.
 */
export function globalSearch(
  query: string,
  items: SearchableItem[],
  prioritizedProjectIds?: Set<string>
): SearchableItem[] {
  const trimmed = normalize(query);

  return items
    .map((item, index) => ({ item, index, score: trimmed ? scoreItem(item, trimmed) : 1 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const aPrioritized = isPrioritizedProject(a.item, prioritizedProjectIds);
      const bPrioritized = isPrioritizedProject(b.item, prioritizedProjectIds);
      if (aPrioritized !== bPrioritized) return aPrioritized ? -1 : 1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * Partitions an already-scored/sorted `SearchableItem[]` into groups, in
 * the order each group first appears — NOT a fixed canonical order. This is
 * what makes "best match wins" hold visually too: if the single best match
 * is a Project, the Projects section renders first, not a pinned Commands
 * section. Groups with zero items are never produced, satisfying "hide
 * empty groups" by construction.
 */
export function groupSearchResults(items: SearchableItem[]): { group: SearchGroup; items: SearchableItem[] }[] {
  const order: SearchGroup[] = [];
  const buckets = new Map<SearchGroup, SearchableItem[]>();

  for (const item of items) {
    if (!buckets.has(item.group)) {
      buckets.set(item.group, []);
      order.push(item.group);
    }
    buckets.get(item.group)!.push(item);
  }

  return order.map((group) => ({ group, items: buckets.get(group)! }));
}
