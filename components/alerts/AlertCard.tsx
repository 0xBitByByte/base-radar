"use client";

import Link from "next/link";
import { Pin } from "lucide-react";

import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { CATEGORY_ICON, CATEGORY_LABEL, SEVERITY_BORDER_CLASS } from "@/components/alerts/meta";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { Tooltip } from "@/components/ui/Tooltip";
import { getProject } from "@/data/projects/helpers";
import { formatRelativeTime } from "@/lib/data/format";
import type { Alert } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

type AlertCardProps = {
  alert: Alert;
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
};

/**
 * One alert in the feed. The "stretched link" pattern is used
 * deliberately: the clickable surface (`<Link>`/`<button>`) is
 * absolutely-positioned UNDER the visible content and covers the full
 * card, while the Pin button is a `relative z-10` sibling — this makes
 * the whole card clickable and keyboard-focusable via one real anchor/
 * button (never a `<button>` nested inside an `<a>`, which is invalid
 * HTML and breaks screen readers) while still letting Pin be an
 * independently-clickable control layered above it.
 *
 * Opening an alert (click or Enter/Space on the card) marks it read.
 * Alerts without an `actionUrl` still mark read on click; there's just
 * nowhere to navigate.
 */
export function AlertCard({ alert, onOpen, onTogglePin }: AlertCardProps) {
  const CategoryIcon = CATEGORY_ICON[alert.category];
  // A pure, synchronous lookup against the static Project Registry
  // (`data/projects/seed`) — no fetch, no provider call. `logoUrl` is
  // `undefined` for most seed entries; `ProjectLogo` already falls back to
  // initials when that happens, matching every other logo render site.
  const project = getProject(alert.projectId);

  return (
    <li
      className={cn(
        "group relative flex gap-3 rounded-xl border border-l-4 p-3 transition-colors",
        SEVERITY_BORDER_CLASS[alert.severity],
        alert.read
          ? "border-radar-light-border bg-radar-light-card dark:border-white/10 dark:bg-transparent"
          : "border-radar-light-border bg-radar-primary/[0.03] dark:border-white/10 dark:bg-white/[0.03]",
        "hover:bg-radar-light-surface dark:hover:bg-white/[0.05]"
      )}
    >
      {alert.actionUrl ? (
        <Link
          href={alert.actionUrl}
          onClick={() => onOpen(alert.id)}
          aria-label={`${alert.title} — ${alert.projectName}. ${alert.summary}`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => onOpen(alert.id)}
          aria-label={`${alert.title} — ${alert.projectName}. ${alert.summary}`}
          className="absolute inset-0 z-0 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <span
        className="relative z-[1] mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-radar-light-border bg-radar-light-surface text-radar-light-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-muted"
        aria-hidden="true"
      >
        <CategoryIcon className="size-4 shrink-0" />
      </span>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {!alert.read && (
              <span
                className="size-2 shrink-0 rounded-full bg-radar-primary dark:bg-radar-accent"
                role="img"
                aria-label="Unread"
              />
            )}
            <span
              className={cn(
                "truncate text-sm text-radar-light-text dark:text-radar-white",
                alert.read ? "font-medium" : "font-semibold"
              )}
            >
              {alert.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[10.5px] whitespace-nowrap text-radar-light-muted sm:inline dark:text-radar-muted">
              {formatRelativeTime(alert.timestamp)}
            </span>
            <Tooltip content={alert.pinned ? "Unpin" : "Pin to top"}>
              <button
                type="button"
                aria-label={alert.pinned ? `Unpin ${alert.title}` : `Pin ${alert.title} to top`}
                aria-pressed={alert.pinned}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin(alert.id);
                }}
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg outline-none transition-colors",
                  "hover:bg-radar-light-border/60 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:hover:bg-white/10",
                  alert.pinned ? "text-radar-warning" : "text-radar-light-muted dark:text-radar-muted"
                )}
              >
                <Pin className={cn("size-3.5 shrink-0", alert.pinned && "fill-current")} aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {alert.summary}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="flex items-center gap-1.5 rounded-full border border-radar-light-border bg-radar-light-surface px-2 py-0.5 text-[10.5px] font-medium text-radar-light-text dark:border-white/10 dark:bg-white/[0.03] dark:text-radar-white">
            <ProjectLogo logoUrl={project?.logoUrl} name={alert.projectName} size={14} />
            {alert.projectName}
          </span>
          <SeverityBadge severity={alert.severity} />
          <span className="rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
            {CATEGORY_LABEL[alert.category]}
          </span>
          <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">via {alert.source}</span>
          <span className="text-[10.5px] text-radar-light-muted sm:hidden dark:text-radar-muted">
            · {formatRelativeTime(alert.timestamp)}
          </span>
        </div>
      </div>
    </li>
  );
}
