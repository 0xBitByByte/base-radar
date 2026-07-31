"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Filter, Loader2, RotateCcw, X } from "lucide-react";

import { ClearFiltersButton } from "@/components/explorer/ClearFiltersButton";
import { FilterChip } from "@/components/explorer/FilterChip";
import { FilterGroup } from "@/components/explorer/FilterGroup";
import { formatLabel } from "@/components/explorer/format";
import { FinancialRangeGroup } from "@/components/projects/FinancialRangeGroup";
import { buildProjectsQuery, hasActiveFilters, type ProjectsQueryState } from "@/components/projects/queryState";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import type { DiscoveryStatus } from "@/lib/discovery/status";
import { FINANCIAL_METRIC_PROVIDER, FINANCIAL_RANGES } from "@/lib/projects/financial";
import {
  FINANCIAL_METRICS,
  FINANCIAL_METRIC_LABELS,
  type ConfidenceLevel,
  type FinancialMetric,
  type FinancialRangeDef,
  type FinancialRangeId,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

const FILTER_PANEL_ID = "projects-filter-panel";

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Maps each financial metric to the `ProjectsQueryState` field that holds its active range — the one place that association is spelled out. */
const FINANCIAL_METRIC_STATE_KEY: Record<FinancialMetric, "tvlRange" | "liquidityRange" | "marketCapRange" | "volumeRange"> = {
  tvl: "tvlRange",
  liquidity: "liquidityRange",
  marketCap: "marketCapRange",
  volume: "volumeRange",
};

/**
 * The filterable subset of `ProjectsQueryState` this panel edits —
 * search/sort/pagination, Category/Confidence (toolbar controls), and (as of
 * Round 6) `verified` all belong elsewhere or nowhere in this panel's own UI.
 * `verified` is deliberately excluded: see the Round 6 doc comment on the
 * component below for why the Verification section itself was removed.
 */
type PendingFilters = Pick<ProjectsQueryState, "discoveryStatuses" | "hasVolume" | "tvlRange" | "liquidityRange" | "marketCapRange" | "volumeRange">;

function pendingFromState(state: ProjectsQueryState): PendingFilters {
  return {
    discoveryStatuses: state.discoveryStatuses,
    hasVolume: state.hasVolume,
    tvlRange: state.tvlRange,
    liquidityRange: state.liquidityRange,
    marketCapRange: state.marketCapRange,
    volumeRange: state.volumeRange,
  };
}

const EMPTY_PENDING: PendingFilters = {
  discoveryStatuses: [],
  hasVolume: false,
  tvlRange: null,
  liquidityRange: null,
  marketCapRange: null,
  volumeRange: null,
};

/**
 * Everything this panel can change, for the trigger button's own "how many
 * advanced filters are active" count — deliberately excludes Category/
 * Confidence (their own toolbar control already shows the selected value)
 * and, as of Round 6, `verified` (no control anywhere in this panel sets it
 * anymore — see the component doc comment). The "Verified" chip below still
 * surfaces and clears a stray `?verified=true` if one somehow reaches the
 * page (a shared link, e.g.), but it no longer counts toward this badge,
 * exactly like Category/Confidence don't: the chip is that state's one
 * visible representation now, so a second count here would double it up.
 */
function advancedFilterCount(state: ProjectsQueryState): number {
  return (
    (state.hasVolume ? 1 : 0) +
    state.discoveryStatuses.length +
    (state.tvlRange ? 1 : 0) +
    (state.liquidityRange ? 1 : 0) +
    (state.marketCapRange ? 1 : 0) +
    (state.volumeRange ? 1 : 0)
  );
}

/**
 * PR-071 Round 4 — Task 4: the panel's "N filters active" summary reads the
 * whole applied `state`, not just this panel's own facets — Category and
 * Confidence are edited in the toolbar, but they're still real, active
 * constraints on what's showing, so a summary that omitted them would be
 * lying about how filtered the list actually is. Always built from `state`
 * (applied), never `pending` (in-progress edits) — this describes what's
 * true right now, not what a half-finished edit might become.
 */
function buildActiveSummaryLines(state: ProjectsQueryState): string[] {
  const lines: string[] = [];
  if (state.categories.length > 0) {
    lines.push(`Category: ${state.categories.map((category) => CATEGORY_BRANDING[category].label).join(", ")}`);
  }
  if (state.confidenceLevel) lines.push(`Confidence: ${CONFIDENCE_LABELS[state.confidenceLevel]}`);
  if (state.verified) lines.push("Verified only");
  if (state.hasVolume) lines.push("Has Volume");
  if (state.discoveryStatuses.length > 0) {
    lines.push(`Discovery: ${state.discoveryStatuses.map(formatLabel).join(", ")}`);
  }
  for (const metric of FINANCIAL_METRICS) {
    const rangeId = state[FINANCIAL_METRIC_STATE_KEY[metric]];
    if (!rangeId) continue;
    const def = FINANCIAL_RANGES[metric].find((range) => range.id === rangeId);
    lines.push(`${FINANCIAL_METRIC_LABELS[metric]}: ${def?.label ?? rangeId}`);
  }
  return lines;
}

type AccordionKey = "financial" | "discovery";
type Placement = "down" | "up";

type ProjectsFilterBarProps = {
  state: ProjectsQueryState;
  /** Every facet option is computed server-side over the full, unfiltered registry (`components/projects/filterOptions.ts`) — never recomputed here. */
  availableDiscoveryStatuses: DiscoveryStatus[];
  /** Per-metric range options, already narrowed to real, non-empty buckets server-side. An empty array for a metric means "hide this filter entirely" — no reliable provider data exists for it right now. */
  financialRangeOptions: Record<FinancialMetric, FinancialRangeDef[]>;
};

/**
 * PR-071 Round 2 — Task 1/8: the Filter Panel is a small anchored popover
 * (never pushes the project list down, never covers it). Edits are staged
 * locally (`pending`) and only committed to the URL when Apply is pressed;
 * Reset discards the staged edits; Clear All clears and applies immediately.
 *
 * PR-071 Round 3 — removed duplicated facets (Category/Confidence moved to
 * the toolbar only; Verification simplified to a single "Verified" toggle);
 * capped the panel's height to the real viewport and made only its middle
 * section scroll, so the Apply/Reset footer is never pushed off-screen.
 *
 * PR-071 Round 4 — four refinements on top of that:
 *
 * (1) Positioning: rather than shrinking the panel further when there's
 * little room below the trigger, it now flips to open *upward* whenever
 * that gives it more real room (`recomputePanelLayout`) — shrinking the
 * height is the last resort, not the first one. A true "centered modal"
 * mode was considered and skipped: that's a different interaction pattern
 * (backdrop, focus trap) than an anchored popover, which would cross into
 * new architecture for a polish-only round.
 *
 * (2) Width: widened from `max-w-sm` (24rem) to `max-w-md` (28rem) with
 * roomier internal padding, so Financial's multiple range pickers don't
 * feel cramped.
 *
 * (3) Group order: Financial → Discovery → Verification (Verification since
 * removed — see Round 6 below) — most-reached-for first. Security/Developer/
 * Governance sections named in the brief have no
 * corresponding facet anywhere in `ProjectsQueryState`/`lib/projects/filter.ts`
 * today; inventing filterable dimensions for data this app doesn't track
 * would be new architecture, so they're intentionally not added — see the
 * PR's own final report for the full reasoning.
 *
 * (4)+(5) Active summary + per-section badges: opening the panel now shows
 * "N filters active" plus one real line per active facet (reading the whole
 * applied `state`, including Category/Confidence — see
 * `buildActiveSummaryLines`); each collapsed accordion header shows its own
 * live count (e.g. "Financial (2)") from the in-progress `pending` edits, so
 * a user never has to expand every section just to see what's set.
 *
 * The chip row and "Clear filters" link next to the trigger button still
 * reflect the currently *applied* filters (`state`), never the panel's
 * pending edits — removing a chip is a direct, immediate change. Category
 * and Confidence intentionally have no chip here — their one visible,
 * editable representation is already their own toolbar control.
 *
 * PR-071 Round 5 — the trigger moved from the toolbar's far-right edge to
 * just before Sort (`ProjectsInteractionBar.tsx`), which is the actual fix
 * for horizontal overflow: a popover anchored to its trigger's left edge
 * (`left-0` below, unchanged, never centered or right-aligned) needs real
 * room to its right to expand into, and the old trigger position — the very
 * last thing in the row — had none. No new horizontal positioning logic was
 * added here; the vertical up/down flip from Round 4 (`recomputePanelLayout`)
 * is untouched, since that solves a separate, still-real problem (limited
 * viewport *height*) that moving the trigger sideways has no effect on.
 *
 * PR-071 Round 6 — an information-architecture fix, not a UI one: the
 * "Verification" group here and the "Discovery Status" group next to it were
 * exposing the *same* underlying fact as two independently-checkable
 * "Verified" options with no visible way to tell them apart. Root cause:
 * `"verified"` is itself one of the 11 real `DiscoveryStatus` values
 * (`lib/discovery/status.ts`), so whenever any project had
 * `discoveryStatus === "verified"`, the Discovery Status list grew a
 * `formatLabel("verified")` → `"Verified"` checkbox — identical text to this
 * panel's own hardcoded Verification checkbox, but bound to a narrower
 * condition (`discoveryStatuses.includes("verified")`, i.e. exact-match on
 * `project.discoveryStatus`) than the Verification checkbox's broader
 * `isVerified()` OR (`verification.status === "verified"` OR
 * `discoveryStatus === "verified"`, `lib/projects/collections.ts`) — so they
 * could even select different result sets under the same label.
 *
 * Two changes, not one:
 *
 * (1) `"verified"` is now excluded from what `availableDiscoveryStatuses()`
 * offers (`filterOptions.ts`) — Discovery Status answers one question,
 * "where is this project in Base Radar's own lifecycle," and verification is
 * a trust judgment, not a lifecycle stage. The underlying `DiscoveryStatus`
 * type is untouched; this only changes which values this one checkbox list
 * offers.
 *
 * (2) The Verification section itself is removed entirely, not just
 * relabeled. Checked against its only real job — letting a user narrow to
 * verified projects — it turned out to duplicate an already-existing, more
 * capable path: the "Verified Projects" Smart View (`viewMeta.ts`) is a
 * one-click preset built on the exact same `isVerified()` predicate, and
 * (via `collectionPipeline.ts`'s `baseListForView` → `filterLiveProjects`
 * pipeline) is *already* composable with every other filter — Category,
 * Confidence, Financial, Discovery Status all still apply on top of it. A
 * "Verified Only" checkbox here would only ever reproduce a click a user can
 * already make elsewhere, for one boolean, inside its own accordion group —
 * not worth keeping as a second path to the same place. `ProjectsQueryState
 * .verified`, `FilterOptions.verified`, and `isVerified()` itself are left
 * exactly as they are; only this panel's control for *setting* the flag is
 * gone. The removable "Verified" chip (driven by `state.verified`, shown
 * only when true) stays, so a stray `?verified=true` from an old bookmark or
 * shared link is still visible and still clearable — never a silent,
 * un-actionable state — even though nothing in this panel can set it again.
 */
export function ProjectsFilterBar({ state, availableDiscoveryStatuses, financialRangeOptions }: ProjectsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingFilters>(() => pendingFromState(state));
  const [expandedGroups, setExpandedGroups] = useState<Record<AccordionKey, boolean>>({
    financial: false,
    discovery: false,
  });

  const activeCount = advancedFilterCount(state);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const PANEL_DESIRED_HEIGHT = 480;
  const PANEL_MIN_USABLE_HEIGHT = 260;
  const PANEL_DESIRED_WIDTH = 448; // matches the `max-w-md` this used to be a static class for
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | null>(null);
  const [panelMaxWidth, setPanelMaxWidth] = useState<number | null>(null);
  const [placement, setPlacement] = useState<Placement>("down");

  function recomputePanelLayout() {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 24;
    const spaceAbove = rect.top - 24;
    // Prefer "down" (the natural reading direction) whenever it fits, or whenever it's simply roomier than "up" — flip only when "up" genuinely offers more usable space. Shrinking the panel is the last resort, applied only after picking whichever side has more room.
    const nextPlacement: Placement = spaceBelow >= PANEL_MIN_USABLE_HEIGHT || spaceBelow >= spaceAbove ? "down" : "up";
    const space = nextPlacement === "down" ? spaceBelow : spaceAbove;
    setPlacement(nextPlacement);
    // `PANEL_MIN_USABLE_HEIGHT` only steers which side to open on (above) — it is never a hard
    // floor on the final height. Forcing the panel taller than the room it actually has would
    // push it off-screen; fitting on-screen always wins over the "not too cramped" preference.
    setPanelMaxHeight(Math.min(PANEL_DESIRED_HEIGHT, space));
    // Round 5 — the panel always opens from the trigger's left edge (never centered, never
    // right-aligned, and never flipped sideways — that would be exactly the "complicated
    // positioning calculation" this round asked to avoid). The one thing it does need is a
    // width that can't push past the right edge of the screen: `rect.left` is fixed by where
    // the trigger sits in the toolbar, so the space to its right is a hard ceiling, not a
    // preference — same idea as the height clamp above, just the horizontal axis.
    const spaceRight = window.innerWidth - rect.left - 16;
    setPanelMaxWidth(Math.min(PANEL_DESIRED_WIDTH, spaceRight));
  }

  function openPanel() {
    setPending(pendingFromState(state)); // always start from what's actually applied right now
    recomputePanelLayout();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = !!rowRef.current?.contains(target);
      const clickedPanel = !!panelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", recomputePanelLayout);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", recomputePanelLayout);
    };
  }, [open]);

  function toggleGroup(key: AccordionKey) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function applyAndNavigate(overrides: Partial<ProjectsQueryState>) {
    startTransition(() => {
      router.push(`${pathname}${buildProjectsQuery(state, overrides)}`, { scroll: false });
    });
  }

  function handleApply() {
    applyAndNavigate(pending);
    setOpen(false);
  }

  function handleReset() {
    setPending(pendingFromState(state));
  }

  function handleClearAll() {
    setPending(EMPTY_PENDING);
    // `categories`/`confidenceLevel`/`verified` are spelled out explicitly here (not sourced from
    // `EMPTY_PENDING`) because none of the three are part of `pending` — Category/Confidence live in
    // the toolbar, and `verified` has no control anywhere in this panel as of Round 6 — but Clear All
    // still has to zero out every real active filter, including ones this panel can no longer set.
    applyAndNavigate({ ...EMPTY_PENDING, categories: [], confidenceLevel: null, verified: false });
    setOpen(false);
  }

  const activeFinancialMetrics = FINANCIAL_METRICS.filter((metric) => financialRangeOptions[metric].length > 0);
  const pendingDirty = JSON.stringify(pending) !== JSON.stringify(pendingFromState(state));
  const summaryLines = buildActiveSummaryLines(state);

  // Per-section live counts (from `pending`, not `state`) — the accordion badges update as a user checks boxes, before Apply commits anything.
  const financialGroupCount =
    (pending.hasVolume ? 1 : 0) + FINANCIAL_METRICS.reduce((sum, metric) => sum + (pending[FINANCIAL_METRIC_STATE_KEY[metric]] ? 1 : 0), 0);
  const discoveryGroupCount = pending.discoveryStatuses.length;

  // Applied chips (outside the panel) always reflect `state`, never `pending` — removing one is immediate. Category/Confidence deliberately have no chip: their toolbar control already shows the current selection.
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...(state.verified
      ? [
          {
            key: "verified",
            label: "Verified",
            onRemove: () => applyAndNavigate({ verified: false }),
          },
        ]
      : []),
    ...(state.hasVolume
      ? [
          {
            key: "hasVolume",
            label: "Has Volume",
            onRemove: () => applyAndNavigate({ hasVolume: false }),
          },
        ]
      : []),
    ...state.discoveryStatuses.map((status) => ({
      key: `discovery-${status}`,
      label: `Discovery: ${formatLabel(status)}`,
      onRemove: () => applyAndNavigate({ discoveryStatuses: state.discoveryStatuses.filter((item) => item !== status) }),
    })),
    ...FINANCIAL_METRICS.filter((metric) => state[FINANCIAL_METRIC_STATE_KEY[metric]]).map((metric) => {
      const rangeId = state[FINANCIAL_METRIC_STATE_KEY[metric]] as FinancialRangeId;
      const def = FINANCIAL_RANGES[metric].find((range) => range.id === rangeId);
      return {
        key: `financial-${metric}`,
        label: `${FINANCIAL_METRIC_LABELS[metric]}: ${def?.label ?? rangeId}`,
        onRemove: () => applyAndNavigate({ [FINANCIAL_METRIC_STATE_KEY[metric]]: null }),
      };
    }),
  ];

  return (
    <div ref={rowRef} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-controls={FILTER_PANEL_ID}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
          activeCount > 0
            ? "border-radar-primary/30 bg-radar-primary/10 text-radar-primary"
            : "border-radar-light-border bg-radar-light-surface text-radar-light-text hover:bg-radar-light-border/30 dark:border-white/10 dark:bg-white/5 dark:text-radar-white"
        )}
      >
        <Filter className="size-4" aria-hidden="true" />
        Filters{activeCount > 0 && ` (${activeCount})`}
        <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
        {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      </button>

      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.div
            key={chip.key}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <FilterChip label={chip.label} onRemove={chip.onRemove} />
          </motion.div>
        ))}
      </AnimatePresence>

      {hasActiveFilters(state) && <ClearFiltersButton onClick={handleClearAll} />}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id={FILTER_PANEL_ID}
            initial={{ opacity: 0, y: placement === "down" ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "down" ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              maxHeight: panelMaxHeight !== null ? `${panelMaxHeight}px` : "min(30rem, calc(100vh - 7rem))",
              maxWidth: panelMaxWidth !== null ? `${panelMaxWidth}px` : "min(28rem, calc(100vw - 2rem))",
            }}
            className={cn(
              // Always anchored to the trigger's own left edge — never centered, never right-aligned, never
              // flipped to the other horizontal side. `maxWidth` above (computed in `recomputePanelLayout`)
              // is the only thing standing between this and a right-edge overflow; `w-[calc(100vw-2rem)]`
              // is just the mobile floor so it never gets *too* narrow to use on a small phone.
              "absolute left-0 z-30 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-radar-light-border bg-radar-light-card shadow-2xl dark:border-white/10 dark:bg-radar-card",
              placement === "down" ? "top-full mt-2" : "bottom-full mb-2"
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-radar-light-border px-5 py-3 dark:border-white/10">
              <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="flex size-6 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Task 4 — always reflects what's actually applied, never the in-progress `pending` edits below. */}
            <div className="shrink-0 border-b border-radar-light-border px-5 py-3 dark:border-white/10">
              {summaryLines.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                    {summaryLines.length} filter{summaryLines.length === 1 ? "" : "s"} active
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {summaryLines.map((line) => (
                      <li key={line} className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                        {line}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-radar-light-muted dark:text-radar-muted">No filters applied</p>
              )}
            </div>

            {/* The one scrolling region — capped by the panel's own max-height, never the whole popover. Header, summary, and footer stay put as its `shrink-0` flex siblings. */}
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-radar-light-border overflow-y-auto dark:divide-white/[0.06]">
              {activeFinancialMetrics.length > 0 && (
                <AccordionGroup
                  label="Financial"
                  count={financialGroupCount}
                  expanded={expandedGroups.financial}
                  onToggle={() => toggleGroup("financial")}
                >
                  <div className="flex flex-col gap-5">
                    <FilterGroup
                      label="Volume"
                      options={["hasVolume"] as const}
                      selected={pending.hasVolume ? ["hasVolume"] : []}
                      onChange={(next) => setPending((prev) => ({ ...prev, hasVolume: next.includes("hasVolume") }))}
                      formatOption={() => "Has Volume"}
                    />
                    {activeFinancialMetrics.map((metric) => (
                      <FinancialRangeGroup
                        key={metric}
                        label={`${FINANCIAL_METRIC_LABELS[metric]} · via ${PROVIDER_BRANDING[FINANCIAL_METRIC_PROVIDER[metric]].label}`}
                        ranges={financialRangeOptions[metric]}
                        selected={pending[FINANCIAL_METRIC_STATE_KEY[metric]]}
                        onChange={(next) => setPending((prev) => ({ ...prev, [FINANCIAL_METRIC_STATE_KEY[metric]]: next }))}
                      />
                    ))}
                  </div>
                </AccordionGroup>
              )}

              <AccordionGroup
                label="Discovery Status"
                count={discoveryGroupCount}
                expanded={expandedGroups.discovery}
                onToggle={() => toggleGroup("discovery")}
              >
                <FilterGroup
                  label="Discovery Status"
                  options={availableDiscoveryStatuses}
                  selected={pending.discoveryStatuses}
                  onChange={(next) => setPending((prev) => ({ ...prev, discoveryStatuses: next }))}
                  formatOption={formatLabel}
                />
              </AccordionGroup>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-radar-light-border px-5 py-3 dark:border-white/10">
              <motion.button
                type="button"
                onClick={handleReset}
                disabled={!pendingDirty}
                whileTap={pendingDirty ? { scale: 0.96 } : undefined}
                className="flex items-center gap-1 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-radar-muted dark:hover:text-radar-white"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={handleClearAll}
                  whileTap={{ scale: 0.96 }}
                  className="text-xs font-medium text-radar-light-muted underline-offset-2 outline-none transition-colors hover:text-radar-light-text hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
                >
                  Clear All
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleApply}
                  disabled={isPending}
                  whileTap={!isPending ? { scale: 0.96 } : undefined}
                  className="flex items-center gap-1.5 rounded-lg bg-radar-primary px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-radar-accent dark:text-radar-bg dark:hover:bg-radar-accent/90"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
                  Apply
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccordionGroup({
  label,
  count,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  /** Live count of active items within this section — rendered as a small badge next to the label so a collapsed section still tells a user what's set inside it (Task 5). Omitted (no badge) when 0. */
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex items-center justify-between gap-2 px-5 py-3 text-left outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-inset dark:hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-radar-light-text dark:text-radar-white">
          {label}
          {count > 0 && (
            <span className="flex min-w-[1.1rem] items-center justify-center rounded-full bg-radar-primary/10 px-1 py-0.5 text-[10px] font-semibold text-radar-primary dark:bg-radar-accent/15 dark:text-radar-accent">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-radar-light-muted transition-transform duration-150 dark:text-radar-muted",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
