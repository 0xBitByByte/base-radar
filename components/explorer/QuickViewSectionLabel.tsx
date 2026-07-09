import type { ReactNode } from "react";

type QuickViewSectionLabelProps = {
  children: ReactNode;
};

/**
 * A small section heading used identically across `QuickViewMetrics`,
 * `QuickViewCommunity`, and `QuickViewSources` — extracted because it's the
 * same three-plus-time repetition, not a speculative one-off. The existing
 * `SectionTitle` component (docs/explorer/04 §13's Open Question) was
 * reviewed and isn't a fit here: it's sized for landing-page sections
 * (`text-3xl`) and hardcodes dark-theme-only colors, neither of which suits
 * a compact, both-themes drawer subsection label.
 */
export function QuickViewSectionLabel({ children }: QuickViewSectionLabelProps) {
  return (
    <h3 className="text-xs font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
      {children}
    </h3>
  );
}
