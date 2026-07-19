"use client";

import { Trash2 } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { NOTIFICATION_TYPE_FILTER_LABEL } from "@/components/notifications/filters";
import { TIMELINE_EVENT_ICON } from "@/components/timeline/TimelineEventBadge";
import { useNotificationPreferences } from "@/lib/hooks/useNotificationPreferences";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";

/**
 * `/dashboard/settings/notifications` — no existing `/dashboard/settings`
 * page exists yet in this codebase to inherit a "settings design language"
 * from (the Sidebar links to it, but no `page.tsx` has ever been built), so
 * this page follows the same card/section chrome the rest of the dashboard
 * already uses (borders, rounded corners, the same spacing rhythm as
 * `NotificationCenter`'s own Metrics section) rather than inventing a new
 * visual style. The toggle switch reuses `@base-ui/react/switch` exactly
 * like `components/ui/ThemeToggle.tsx` already does — the one switch
 * primitive this codebase has, not a second one.
 */
export function NotificationPreferencesPage() {
  const { preferences, setEnabled } = useNotificationPreferences();
  const { clearReadState } = useNotifications();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Notification Preferences</h1>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          Choose which notification types appear in the bell, the Dashboard widget, and the Notification page.
        </p>
      </div>

      <section aria-labelledby="notification-preferences-types-heading" className="flex flex-col gap-3">
        <h2
          id="notification-preferences-types-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Notification Types
        </h2>
        <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border bg-radar-light-card dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02]">
          {TIMELINE_EVENT_TYPES.map((type) => {
            const Icon = TIMELINE_EVENT_ICON[type];
            const enabled = preferences[type];
            const label = NOTIFICATION_TYPE_FILTER_LABEL[type];

            return (
              <div key={type} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-radar-light-text dark:text-radar-white">
                  <Icon className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
                <Switch.Root
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(type, checked)}
                  aria-label={`${enabled ? "Disable" : "Enable"} ${label} notifications`}
                  className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:data-[checked]:bg-radar-primary dark:focus-visible:ring-offset-radar-bg"
                >
                  <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6 dark:bg-radar-bg" />
                </Switch.Root>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="notification-preferences-read-state-heading" className="flex flex-col gap-3">
        <h2
          id="notification-preferences-read-state-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Read State
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-radar-light-text dark:text-radar-white">Clear read history</p>
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">
              Marks every notification unread again. Does not delete or regenerate any notification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => clearReadState()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Clear read history
          </button>
        </div>
      </section>
    </div>
  );
}
