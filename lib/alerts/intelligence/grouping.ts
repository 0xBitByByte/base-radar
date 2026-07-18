/** Stage 3 of the pipeline — pure, no I/O. */

import type { Alert } from "@/lib/alerts/types";

export type ProjectAlertGroup = {
  projectId: string;
  projectName: string;
  alerts: Alert[];
};

/**
 * Groups already-normalized alerts by project. Group order follows each
 * project's first appearance in `alerts` (already newest-first, pinned-
 * first, from `lib/alerts/service.ts`'s cache) — a group's own alerts keep
 * whatever relative order they arrived in, never re-sorted here.
 */
export function groupAlertsByProject(alerts: Alert[]): ProjectAlertGroup[] {
  const groups = new Map<string, ProjectAlertGroup>();

  for (const alert of alerts) {
    const existing = groups.get(alert.projectId);
    if (existing) {
      existing.alerts.push(alert);
    } else {
      groups.set(alert.projectId, {
        projectId: alert.projectId,
        projectName: alert.projectName,
        alerts: [alert],
      });
    }
  }

  return Array.from(groups.values());
}
