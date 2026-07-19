/**
 * The Automation page's one-line overview sentence — a pure,
 * presentation-layer read over an already-built `AutomationResult[]`, not
 * an Automation Engine concern, mirroring
 * `components/notifications/summary.ts`'s exact reasoning: the model
 * carries no collection-level headline/summary field of its own.
 */

export function buildAutomationSummary(total: number, critical: number): string {
  if (total === 0) return "No automation results yet.";
  if (critical === 0) return `${total} automation${total === 1 ? "" : "s"} triggered.`;
  return `${total} automation${total === 1 ? "" : "s"} triggered, ${critical} critical.`;
}
