import type { ReactNode } from "react";

type ExplorerGridLayoutProps = {
  children: ReactNode;
};

/**
 * The responsive column container — owns only column count and gutter
 * spacing per viewport (docs/explorer/03 §16/§21, docs/explorer/04 §4).
 * Reuses the exact breakpoint family already used by the dashboard's own
 * widget grid (app/dashboard/page.tsx's `grid-cols-1 sm:grid-cols-2
 * xl:grid-cols-3`), extended one step further for a wide desktop column,
 * rather than inventing new breakpoints.
 */
export function ExplorerGridLayout({ children }: ExplorerGridLayoutProps) {
  return (
    <div aria-label="Projects" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
