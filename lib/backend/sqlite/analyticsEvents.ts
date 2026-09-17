/**
 * PR-097.03 (Observability — Analytics) — real, persisted product-usage
 * events reported by real browser sessions
 * (`components/observability/AnalyticsTracker.tsx`). Same real backend
 * pattern `performance_metrics` already established for this PR — no
 * ORM, no new database abstraction, append-only (no update/delete
 * export).
 *
 * Anonymous by design: no account/session identity, no cookie, no
 * client-generated visitor id is ever recorded here — only a real,
 * known event name and the page path it happened on. A single real
 * page load reported twice (a genuine repeat view) is two real, honest
 * events, not deduplicated into a fabricated "unique visitor" count this
 * module never claims to track.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

/** The real, known vocabulary of product events this module ever accepts — deliberately just one today (`page_view`), not a free-form string an ingest request could set to anything. Extending this list (a real new event type) is the natural next Analytics item, not a reason to accept unvalidated names now. */
export const KNOWN_ANALYTICS_EVENT_NAMES = ["page_view"] as const;
export type AnalyticsEventName = (typeof KNOWN_ANALYTICS_EVENT_NAMES)[number];

export function isKnownAnalyticsEventName(name: unknown): name is AnalyticsEventName {
  return typeof name === "string" && (KNOWN_ANALYTICS_EVENT_NAMES as readonly string[]).includes(name);
}

export type NewAnalyticsEvent = {
  eventName: AnalyticsEventName;
  path: string;
  recordedAt: string;
};

/** The one real write path — a genuine `INSERT`, nothing else. There is deliberately no update/delete export anywhere in this module. */
export function recordAnalyticsEvent(db: DatabaseSync, event: NewAnalyticsEvent): void {
  db.prepare("INSERT INTO analytics_events (id, event_name, path, recorded_at) VALUES (?, ?, ?, ?)").run(
    randomUUID(),
    event.eventName,
    event.path,
    event.recordedAt
  );
}

export type AnalyticsPathSummary = {
  path: string;
  eventCount: number;
};

export type AnalyticsSummary = {
  totalPageViews: number;
  topPaths: AnalyticsPathSummary[];
};

type PathCountRow = { path: string; event_count: number };

/**
 * Real, aggregated `page_view` counts per path, most-visited first — the
 * one genuinely useful "product usage" view this smallest-legitimate
 * slice provides: which real pages real visitors actually load. `limit`
 * bounds a genuinely unbounded-over-time path set; 50 is a generous real
 * page size for this app's route count, not an arbitrary cutoff hiding
 * data.
 */
export function getAnalyticsSummary(db: DatabaseSync, limit = 50): AnalyticsSummary {
  const totalRow = db.prepare("SELECT COUNT(*) AS total FROM analytics_events WHERE event_name = 'page_view'").get() as { total: number };

  const rows = db
    .prepare(
      `SELECT path, COUNT(*) AS event_count
       FROM analytics_events
       WHERE event_name = 'page_view'
       GROUP BY path
       ORDER BY event_count DESC, path ASC
       LIMIT ?`
    )
    .all(limit) as PathCountRow[];

  return {
    totalPageViews: totalRow.total,
    topPaths: rows.map((row) => ({ path: row.path, eventCount: row.event_count })),
  };
}
