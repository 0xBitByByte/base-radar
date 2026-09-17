"use client";

import { Bell, ShieldCheck, Sparkles, Trash2, TrendingUp, type LucideIcon } from "lucide-react";
import { Switch } from "@base-ui/react/switch";

import { NOTIFICATION_TYPE_FILTER_LABEL } from "@/components/notifications/filters";
import { TIMELINE_EVENT_ICON } from "@/components/timeline/TimelineEventBadge";
import { useNotificationPreferences } from "@/lib/hooks/useNotificationPreferences";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { TIMELINE_EVENT_TYPES, type TimelineEventType } from "@/lib/timeline/types";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_TITLE_CLASS, PAGE_HEADER_SUBTITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { cn } from "@/lib/utils";

/**
 * V2-UX-002 — Notification Preferences Experience Redesign. Groups the same
 * 10 `TimelineEventType`s (unchanged — `TIMELINE_EVENT_TYPES`, the exact
 * finite set `lib/timeline/types.ts` already defines) into the 4 mental-model
 * buckets a reader already has for this app's own domain, rather than one
 * flat, identically-shaped list of icon+label+toggle rows in whatever
 * declaration order the type happened to be defined in. The grouping isn't
 * invented — it falls out directly from what each event type already *is*
 * elsewhere in this codebase: `governance`/`security`/`development` are all
 * signals about one project's own health (`TrustIndicators`/`RiskBadge`'s
 * own domain); `tvl`/`opportunity`/`portfolio` are all money/value-movement
 * signals; `recommendation`/`daily-brief`/`narrative` are all synthesized,
 * cross-project intelligence output; `alert` is the one generic catch-all
 * with no more specific home. Every group maps to a real, already-used icon
 * elsewhere in this app for the same concept (`ShieldCheck` for trust/health
 * on the Project Profile page, `TrendingUp` for market/TVL contexts,
 * `Sparkles` for the Dashboard's own "AI Command Center", `Bell` matching
 * `alert`'s own existing icon) — not new iconography.
 */
type NotificationGroupKey = "project" | "market" | "ai" | "system";

const GROUP_LABEL: Record<NotificationGroupKey, string> = {
  project: "Project Intelligence",
  market: "Market Intelligence",
  ai: "AI Intelligence",
  system: "System",
};

const GROUP_DESCRIPTION: Record<NotificationGroupKey, string> = {
  project: "Signals about one project's own health and activity.",
  market: "Value and opportunity signals across tracked projects.",
  ai: "Synthesized intelligence pulled together across your whole portfolio.",
  system: "General alerts that don't fit a more specific category.",
};

const GROUP_ICON: Record<NotificationGroupKey, LucideIcon> = {
  project: ShieldCheck,
  market: TrendingUp,
  ai: Sparkles,
  system: Bell,
};

const TYPE_GROUP: Record<TimelineEventType, NotificationGroupKey> = {
  governance: "project",
  security: "project",
  development: "project",
  tvl: "market",
  opportunity: "market",
  portfolio: "market",
  recommendation: "ai",
  "daily-brief": "ai",
  narrative: "ai",
  alert: "system",
};

/**
 * V2-UX-002, final copy round — generic, project-agnostic example phrasing,
 * replacing the prior round's project-specific quotes (which all used
 * "Aave" as the stand-in project — accurate, but reads as tied to one
 * specific project rather than illustrating the category). Each example
 * still maps to the same real, verified source traced in the prior
 * round — nothing here describes a notification the system can't actually
 * generate:
 *
 * - `governance`/`security`/`development`/`alert` — a project entering the
 *   `governance-active`/`security-risk`/`development-active` narrative, or
 *   any other narrative for the `alert` catch-all
 *   (`lib/alerts/intelligence/summary.ts:13-21`).
 * - `tvl` — a signal carrying the `tvl` category
 *   (`lib/brief/sections.ts:206-212`).
 * - `opportunity` — the `growth`/`accumulation`/`development-active`
 *   narratives specifically (`lib/brief/sections.ts:20`).
 * - `narrative` — the `${count} projects showing ${narrative}` aggregate
 *   template (`lib/timeline/sections.ts:152`).
 * - `recommendation` — `buildRecommendations`'s portfolio-level advisory
 *   strings (`lib/brief/sections.ts:237`).
 * - `portfolio`/`daily-brief` — `buildPortfolioSummary`/`buildBriefSummary`'s
 *   real digest sentences (`lib/portfolio/summary.ts:18-31`,
 *   `lib/brief/summary.ts:22-33`).
 */
const TYPE_DESCRIPTION: Record<TimelineEventType, string> = {
  governance: "Example: Governance proposal is now live.",
  security: "Example: Security-related activity detected.",
  development: "Example: Development activity has increased.",
  tvl: "Example: TVL increased significantly.",
  opportunity: "Example: On-chain accumulation detected.",
  portfolio: "Example: Portfolio health has changed.",
  recommendation: "Example: AI recommends reviewing this project.",
  "daily-brief": "Example: Daily intelligence summary is ready.",
  narrative: "Example: Multiple projects are showing the same market narrative.",
  alert: "Example: Important project update detected.",
};

const GROUP_ORDER: NotificationGroupKey[] = ["project", "market", "ai", "system"];

/**
 * `/dashboard/settings/notifications` — no existing `/dashboard/settings`
 * page exists yet in this codebase to inherit a "settings design language"
 * from (the Sidebar links to it, but no `page.tsx` has ever been built), so
 * this page follows the same glass card chrome the rest of the dashboard
 * already uses rather than inventing a new visual style. The toggle switch
 * still reuses `@base-ui/react/switch` exactly like
 * `components/ui/ThemeToggle.tsx` already does — the one switch primitive
 * this codebase has, not a second one. `useNotificationPreferences`'s own
 * `preferences`/`setEnabled` contract is completely unchanged; this file
 * only changes how the same 10 booleans are grouped and labeled.
 */
export function NotificationPreferencesPage() {
  const { preferences, setEnabled } = useNotificationPreferences();
  const { clearReadState } = useNotifications();

  const typesByGroup = new Map<NotificationGroupKey, TimelineEventType[]>();
  for (const type of TIMELINE_EVENT_TYPES) {
    const group = TYPE_GROUP[type];
    const existing = typesByGroup.get(group) ?? [];
    existing.push(type);
    typesByGroup.set(group, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Notification Preferences</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          Choose which notification types appear in the bell, the Dashboard widget, and the Notification page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {GROUP_ORDER.map((group) => {
          const types = typesByGroup.get(group) ?? [];
          const GroupIcon = GROUP_ICON[group];
          return (
            <section
              key={group}
              aria-labelledby={`notification-group-${group}-heading`}
              className={cn("flex flex-col gap-3 p-5", GLASS_SURFACE_STATIC)}
            >
              <div className="flex items-start gap-2.5">
                <GroupIcon className="mt-0.5 size-4 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <h2 id={`notification-group-${group}-heading`} className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
                    {GROUP_LABEL[group]}
                  </h2>
                  <p className="text-xs text-radar-light-muted dark:text-radar-muted">{GROUP_DESCRIPTION[group]}</p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-radar-light-border rounded-xl border border-radar-light-border dark:divide-white/10 dark:border-white/10">
                {types.map((type) => {
                  const Icon = TIMELINE_EVENT_ICON[type];
                  const enabled = preferences[type];
                  const label = NOTIFICATION_TYPE_FILTER_LABEL[type];

                  return (
                    <div key={type} className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <span className="flex min-w-0 items-start gap-2.5">
                        <Icon className="mt-0.5 size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium text-radar-light-text dark:text-radar-white">{label}</span>
                          <span className="text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
                            {TYPE_DESCRIPTION[type]}
                          </span>
                        </span>
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
          );
        })}
      </div>

      <section aria-labelledby="notification-preferences-read-state-heading" className="flex flex-col gap-3">
        <h2
          id="notification-preferences-read-state-heading"
          className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
        >
          Read State
        </h2>
        <div className={cn("flex flex-wrap items-center justify-between gap-3 p-4", GLASS_SURFACE_STATIC)}>
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
