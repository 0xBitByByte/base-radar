import type { ReactNode } from "react";

type ProjectMetricsGridProps = {
  children: ReactNode;
};

/**
 * A pure layout wrapper — arranges whatever it's given, and knows nothing
 * about Health, Confidence, TVL, GitHub, or any other metric. This is what
 * makes it reusable beyond Explorer (Quick View, Compare, Portfolio, an AI
 * summary panel) without modification, per this PR's approved architecture.
 * Composition (which metrics appear) always happens at the call site.
 */
export function ProjectMetricsGrid({ children }: ProjectMetricsGridProps) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
