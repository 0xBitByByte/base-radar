/**
 * The Notification page's one-line overview sentence — a pure, presentation-
 * layer read over an already-built `Notification[]`, not a Notification
 * Engine concern: unlike Timeline/Daily Brief/Portfolio Intelligence, the
 * `Notification` model carries no collection-level headline/summary field
 * of its own (each notification only has its own `title`/`summary`), so
 * this small helper lives here rather than expanding `lib/notifications/`.
 */

export function buildNotificationSummary(total: number, unread: number): string {
  if (total === 0) return "No notifications right now.";
  if (unread === 0) return `${total} notification${total === 1 ? "" : "s"}, all read.`;
  return `${total} notification${total === 1 ? "" : "s"}, ${unread} unread.`;
}
