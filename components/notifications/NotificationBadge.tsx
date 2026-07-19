import {
  NOTIFICATION_PRIORITY_BADGE_CLASS,
  NOTIFICATION_PRIORITY_ICON,
  NOTIFICATION_PRIORITY_LABEL,
} from "@/components/notifications/meta";
import type { NotificationPriority } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationBadgeProps = {
  priority: NotificationPriority;
  className?: string;
};

/**
 * The one Priority chip every notification surface reuses — icon + label +
 * a semantic color, the exact same shape `SeverityBadge`/
 * `TimelineEventBadge` already use, never color-only (label text and icon
 * both carry the meaning, so it reads correctly for colorblind users and
 * screen readers alike).
 */
export function NotificationBadge({ priority, className }: NotificationBadgeProps) {
  const Icon = NOTIFICATION_PRIORITY_ICON[priority];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        NOTIFICATION_PRIORITY_BADGE_CLASS[priority],
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {NOTIFICATION_PRIORITY_LABEL[priority]}
    </span>
  );
}
