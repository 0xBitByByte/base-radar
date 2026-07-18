import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { IntelligenceBadge } from "@/components/alerts/IntelligenceBadge";
import { cn } from "@/lib/utils";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  external?: boolean;
  onClick?: () => void;
  /** A small trailing count pill — e.g. the live watchlist count (PR13.1). Omitted (not rendered as "0") when `undefined` or `0`. */
  badge?: number;
  /** PR15.3 Part 2 — additive AI Intelligence indicator, shown alongside (never instead of) `badge`, when at least one `IntelligenceAlert` currently exists. */
  sparkle?: boolean;
};

export function SidebarItem({
  href,
  label,
  icon,
  active = false,
  external = false,
  onClick,
  badge,
  sparkle = false,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-offset-radar-bg",
        active
          ? "bg-radar-primary/10 font-semibold text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
          : "text-radar-light-muted hover:bg-radar-light-surface hover:text-radar-light-text dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
      )}
    >
      {active && (
        <span
          className="absolute top-1/2 -left-1 h-4 w-1 -translate-y-1/2 rounded-full bg-radar-primary dark:bg-radar-accent"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          "shrink-0",
          active && "text-radar-primary dark:text-radar-accent"
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {sparkle && <IntelligenceBadge variant="icon" />}
      {Boolean(badge) && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums",
            active
              ? "bg-radar-primary/15 text-radar-primary dark:bg-radar-accent/20 dark:text-radar-accent"
              : "bg-radar-light-surface text-radar-light-muted dark:bg-white/10 dark:text-radar-muted"
          )}
        >
          {badge}
        </span>
      )}
      {external && <ExternalLink className="ml-auto size-3.5 opacity-40" aria-hidden="true" />}
    </Link>
  );
}
