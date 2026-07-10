import type { ReactNode } from "react";

type ExplorerGridLayoutProps = {
  children: ReactNode;
};

/**
 * The responsive column container — owns only column count and gutter
 * spacing per viewport (docs/explorer/03 §16/§21, docs/explorer/04 §4).
 *
 * Deliberately a *different* column progression than the dashboard's own
 * widget grid (`app/dashboard/page.tsx`'s `grid-cols-1 sm:grid-cols-2
 * xl:grid-cols-3`, which has no `lg` step): Explorer's cards are compact
 * project tiles, so a project fits a third column earlier than a
 * dashboard widget (sparkline + metric grid + activity feed) would —
 * forcing both grids onto one shared progression would either cram
 * Dashboard's wider widgets in three columns too soon, or leave Explorer
 * under-using available width at `lg`. If that tradeoff is ever
 * reconsidered, change both grids together rather than just this comment.
 */
export function ExplorerGridLayout({ children }: ExplorerGridLayoutProps) {
  return (
    <div aria-label="Projects" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
