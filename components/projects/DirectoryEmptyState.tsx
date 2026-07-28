/**
 * PR-058 — Task 8: context-aware Directory empty states. Never a single
 * generic "no results" message — the real reason nothing matched (an
 * active search, active filters, or a genuinely sparse collection) decides
 * the copy, per `docs/PR-055_PROJECTS_PAGE_UX_ARCHITECTURE.md` §4/§8. Built
 * from the existing `EmptyState` primitive — no new empty-state pattern.
 */

import Link from "next/link";
import { FilterX, PackageSearch, SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type DirectoryEmptyStateProps =
  | { reason: "search"; query: string; clearHref: string }
  | { reason: "filters"; clearHref: string }
  | { reason: "collection"; title: string; description: string };

function ClearLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
    >
      {label}
    </Link>
  );
}

export function DirectoryEmptyState(props: DirectoryEmptyStateProps) {
  if (props.reason === "search") {
    return (
      <EmptyState
        icon={SearchX}
        title={`No projects match "${props.query}"`}
        description="Try a different name, symbol, contract address, or website — or clear your filters, which may be narrowing the results further."
        action={<ClearLink href={props.clearHref} label="Clear search" />}
      />
    );
  }

  if (props.reason === "filters") {
    return (
      <EmptyState
        icon={FilterX}
        title="No projects match your filters"
        description="Try removing a filter — the combination currently selected has no real matches."
        action={<ClearLink href={props.clearHref} label="Clear filters" />}
      />
    );
  }

  return <EmptyState icon={PackageSearch} title={props.title} description={props.description} />;
}
