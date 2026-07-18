import { CATEGORY_ICON, CATEGORY_LABEL } from "@/components/alerts/meta";
import type { IntelligenceSignal } from "@/lib/alerts/intelligence/types";

type SignalPillsProps = {
  signals: IntelligenceSignal[];
};

/**
 * One small neutral chip per distinct contributing signal category —
 * reuses `CATEGORY_ICON`/`CATEGORY_LABEL` (`components/alerts/meta.ts`) and
 * the exact chip styling `AlertCard.tsx`'s category tag already uses, so a
 * "TVL" pill here looks identical to a "TVL" tag on a raw alert. Deduped by
 * category — a project can have two real TVL alerts in one window, but
 * that's one real signal category, not two pills.
 */
export function SignalPills({ signals }: SignalPillsProps) {
  const distinctCategories = Array.from(new Set(signals.map((signal) => signal.category)));

  if (distinctCategories.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {distinctCategories.map((category) => {
        const Icon = CATEGORY_ICON[category];
        return (
          <li
            key={category}
            className="flex items-center gap-1 rounded-full border border-radar-light-border px-2 py-0.5 text-[10.5px] font-medium text-radar-light-muted dark:border-white/10 dark:text-radar-muted"
          >
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            {CATEGORY_LABEL[category]}
          </li>
        );
      })}
    </ul>
  );
}
