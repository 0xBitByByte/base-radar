"use client";

import { AlertTriangle, Clock, History, Lock, Pencil, RotateCcw, ShieldAlert, UserCog } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_HEADER_GROUP_CLASS, PAGE_HEADER_SUBTITLE_CLASS, PAGE_HEADER_TITLE_CLASS } from "@/components/dashboard/pageHeaderStyles";
import { WidgetSkeleton } from "@/components/dashboard/WidgetSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { useAdminActivity } from "@/lib/hooks/useAdminActivity";
import type { ActivityFieldChange, ActivityLogEntry, AdminActivityAction } from "@/lib/backend/sqlite/activityLog";

const ACTION_VERB: Record<AdminActivityAction, string> = {
  EDIT: "edited",
  REVERT: "reverted",
  ROLE_CHANGE: "changed the role for",
};

const ACTION_ICON: Record<AdminActivityAction, typeof Pencil> = {
  EDIT: Pencil,
  REVERT: RotateCcw,
  ROLE_CHANGE: UserCog,
};

/**
 * Real, human-readable value display for an arbitrary changed field —
 * `Project` fields range from plain strings (`name`) to arrays
 * (`categories`) to nested objects (`verification`, `providerIds`). Never
 * fabricates a label for `null`/`undefined` (an honest "—", the same
 * "Not configured" spirit `AdminRegistryPage`'s own read-only detail rows
 * already use) and never silently drops real structured data — an
 * object/array is shown as real JSON, not `"[object Object]"`.
 */
function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ");
  return JSON.stringify(value);
}

/**
 * Formats the canonical UTC `createdAt` timestamp in the real time zone
 * *recorded with the event* — never the current viewer's own browser time
 * zone, per this PR's own explicit requirement: an event recorded by an
 * admin in Asia/Kolkata must keep reading as Asia/Kolkata wall-clock time
 * to every future viewer, regardless of where they are.
 */
function formatRecordedTimestamp(createdAt: string, timeZone: string): { date: string; time: string } {
  const parsed = new Date(createdAt);
  try {
    const date = new Intl.DateTimeFormat("en-US", { timeZone, day: "2-digit", month: "short", year: "numeric" }).format(parsed);
    const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(parsed);
    return { date, time };
  } catch {
    // An honestly-unformattable time zone (shouldn't happen — the server
    // only ever persists a zone it already validated) still shows the
    // real UTC instant rather than silently guessing a different zone.
    return { date: parsed.toISOString().slice(0, 10), time: parsed.toISOString().slice(11, 19) + " UTC" };
  }
}

/**
 * PR-095.05 — `/dashboard/admin/activity`. Real authorization is enforced
 * entirely server-side by `/api/admin/activity` (`resolveAdminAccess`, the
 * exact PR-095.01 boundary). Every row here is a real, persisted
 * `admin_activity_log` record — this page never fabricates a sample entry
 * to demonstrate the UI, and has no edit/delete control of its own: the
 * Activity Log is append-only by construction (see
 * `lib/backend/sqlite/activityLog.ts`'s own top comment), not merely by
 * this page choosing not to offer one.
 */
export function AdminActivityPage() {
  const { state, retry } = useAdminActivity();

  return (
    <div className="flex flex-col gap-6">
      <div className={PAGE_HEADER_GROUP_CLASS}>
        <h1 className={PAGE_HEADER_TITLE_CLASS}>Activity Log</h1>
        <p className={PAGE_HEADER_SUBTITLE_CLASS}>
          A real, append-only record of administrative actions. Visible only to authorized administrators.
        </p>
      </div>

      <AdminNav />

      {state.status === "loading" && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite" aria-label="Loading Activity Log">
          {Array.from({ length: 5 }).map((_, index) => (
            <WidgetSkeleton key={index} className="h-16" />
          ))}
        </div>
      )}

      {state.status === "unauthenticated" && (
        <EmptyState
          icon={Lock}
          title="Sign in required"
          description="The Activity Log is only visible to a signed-in, authorized account. Sign in from the account menu, then reload this page."
        />
      )}

      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Access restricted" description="Your account is signed in but isn't authorized to view the Activity Log." />
      )}

      {state.status === "error" && (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the Activity Log"
          description="Something went wrong while loading activity records. Please try again."
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              Try again
            </button>
          }
        />
      )}

      {state.status === "ready" && (
        state.activity.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Real administrative actions — editing or reverting a Project Registry entry — will appear here as they happen."
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {state.activity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ol>
        )
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const { date, time } = formatRecordedTimestamp(entry.createdAt, entry.timeZone);
  const Icon = ACTION_ICON[entry.action];

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-radar-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <p className="text-sm text-radar-light-text dark:text-radar-white">
            <span className="font-semibold">{entry.actorName}</span> {ACTION_VERB[entry.action]} <span className="font-medium">{entry.entityName}</span>
          </p>
        </div>
        <GlowBadge color={entry.action === "REVERT" ? "warning" : entry.action === "ROLE_CHANGE" ? "accent" : "primary"}>{entry.action}</GlowBadge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-radar-light-muted dark:text-radar-muted">
        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {date} · {time}
        </span>
        <span className="text-radar-light-muted/70 dark:text-radar-muted/70">({entry.timeZone})</span>
      </div>

      {entry.changes.length > 0 && (
        <dl className="flex flex-col gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
          {entry.changes.map((change) => (
            <ChangeRow key={change.field} change={change} />
          ))}
        </dl>
      )}
    </li>
  );
}

function ChangeRow({ change }: { change: ActivityFieldChange }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <dt className="font-semibold text-radar-light-text dark:text-radar-white">{change.field}</dt>
      <dd className="flex flex-col gap-0.5 text-radar-light-muted dark:text-radar-muted sm:flex-row sm:items-baseline sm:gap-2">
        <span>
          From: <span className="text-radar-danger/90">&quot;{formatChangeValue(change.before)}&quot;</span>
        </span>
        <span>
          To: <span className="text-radar-success/90">&quot;{formatChangeValue(change.after)}&quot;</span>
        </span>
      </dd>
    </div>
  );
}
