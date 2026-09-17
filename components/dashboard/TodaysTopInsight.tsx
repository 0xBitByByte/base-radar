"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, EyeOff, RefreshCw, Sparkles } from "lucide-react";

import { CommandCenterSkeleton } from "@/components/dashboard/CommandCenterSkeleton";
import { ProjectLogo } from "@/components/branding/ProjectLogo";
import { GLASS_SURFACE_STATIC } from "@/components/ui/glassStyles";
import { getProject } from "@/data/projects/helpers";
import { buildRecommendations, type Recommendation } from "@/lib/dashboard/commandCenter";
import * as alertService from "@/lib/alerts/service";
import { useAlertRefreshStatus } from "@/lib/hooks/useAlertRefreshStatus";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { useEcosystemIntelligenceAlerts } from "@/lib/hooks/useEcosystemIntelligenceAlerts";
import { cn } from "@/lib/utils";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

const MAX_RECOMMENDATIONS = 4;

const DISMISS_STORAGE_KEY = "base-radar:dashboard-top-insight-dismissed";

type DismissRecord = { date: string; signature: string };

/** Same lazy, SSR-safe, try/catch localStorage read every other simple per-id UI-state flag in this codebase uses (`CollapsibleSection.tsx`'s `readStoredCollapsed`) — not the heavier versioned-store pattern the multi-consumer engines (`lib/search/storage.ts`) use, since this is a single boolean read by one component. */
function readDismissed(): DismissRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DismissRecord>;
    if (typeof parsed.date !== "string" || typeof parsed.signature !== "string") return null;
    return parsed as DismissRecord;
  } catch {
    return null;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stable regardless of array order — changes only when the actual set of recommended projects changes, so re-dismissing today's unchanged set stays dismissed across a reload, but a genuinely new recommendation (a project swap) clears the dismissal. */
function recommendationSetSignature(projectIds: string[]): string {
  return projectIds.slice().sort().join(",");
}

/**
 * V1-FIX-002C — compact card. Two rows were removed from V1-FIX-002B's
 * layout, not just tightened: the per-card direction icon+color is gone
 * (the section it renders under — "Top Opportunities" or "Watch Closely" —
 * already states the direction once for the whole group, so repeating it
 * on every card was redundant chrome, not information), and the category
 * label now sits inline as a small trailing badge on the name row instead
 * of owning its own line. Multiple supporting reasons (capped at 2 by
 * `buildSupportingReasons`) are joined onto ONE muted line with " · "
 * rather than a multi-line list — still every real reason, just not one
 * line each.
 */
function RecommendationCard({ item, logoMap }: { item: Recommendation; logoMap: Record<string, ProjectLogoEntry> }) {
  const logo = logoMap[item.projectId];
  const project = getProject(item.projectId);

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-radar-primary/10 bg-radar-light-surface/40 p-2 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="flex items-center gap-1.5">
        <ProjectLogo logoUrl={logo?.logoUrl} fallbackUrls={logo?.logoUrlFallbacks} name={item.projectName} size={20} className="shrink-0" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-radar-light-text dark:text-radar-white">{item.projectName}</p>
        <span className="shrink-0 truncate text-[9.5px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          {item.categoryLabel}
        </span>
      </div>

      <p className="truncate text-xs font-medium text-radar-light-text dark:text-radar-white">{item.primaryReason}</p>
      {item.supportingReasons.length > 0 && (
        <p className="truncate text-[11px] text-radar-light-muted dark:text-radar-muted">{item.supportingReasons.join(" · ")}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">
          Confidence <span className="font-semibold text-radar-light-text dark:text-radar-white">{item.confidence}%</span>
        </span>
        {project && (
          <Link
            href={`/dashboard/projects/${project.slug}${item.ctaPath ? `/${item.ctaPath}` : ""}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-radar-primary px-2.5 py-1 text-[11px] font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
          >
            {item.ctaLabel}
            <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

function RecommendationGrid({ items, logoMap }: { items: Recommendation[]; logoMap: Record<string, ProjectLogoEntry> }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-1.5",
        items.length >= 2 && "sm:grid-cols-2",
        items.length >= 3 && "xl:grid-cols-3",
        items.length >= 4 && "xl:grid-cols-4"
      )}
    >
      {items.map((item) => (
        <RecommendationCard key={item.projectId} item={item} logoMap={logoMap} />
      ))}
    </div>
  );
}

/** Fades its children in — used for every state that replaces the skeleton (real content, the empty state, the error state) so the swap reads as a soft reveal, never an abrupt pop-in (V1-FIX-003, Requirement 6). */
function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

/**
 * V1-FIX-002 — "AI Command Center," rebuilt from generic counts to specific,
 * per-project intelligence, cross-referencing `IntelligenceAlert[]`
 * (`useEcosystemIntelligenceAlerts()`) against the raw `Alert[]`
 * (`useAlerts()`, already used elsewhere for the Alerts page — no new
 * provider, no new fetch) so a signal's generic label ("TVL change")
 * resolves to the specific real event that produced it ("TVL Increased
 * 4.2%").
 *
 * V1-FIX-002A — replaced the "top N by score" + single "Best Opportunity"
 * split with one unified row of recommendation cards, each covering a real
 * signal category.
 *
 * V1-FIX-002B — three refinements over `lib/dashboard/commandCenter.ts`'s
 * `buildRecommendations()`: two labeled groups by real `direction` ("Top
 * Opportunities"/"Watch Closely"), diversity-preferring (not hard-capped)
 * category selection, and richer per-card content.
 *
 * V1-FIX-002C, final V1 polish — `RecommendationCard` compacted from 5-6
 * rows to 4 and every spacing token tightened one step, bringing the card
 * to the 320-340px target with both groups populated.
 *
 * V1-FIX-003 — loading UX only, no recommendation/styling change. Root
 * cause of the old "appears 2-5s after the rest of the page, everything
 * jumps" bug: this component reads a purely CLIENT-side store
 * (`lib/alerts/service.ts`) that starts empty on both the server and the
 * client's first render and is only filled in once `refreshAlerts()` — a
 * fire-and-forget call awaiting 5 real external providers, live-measured
 * elsewhere in this session at anywhere from ~5s to ~25s cold — resolves.
 * There was never a Suspense boundary or a missing-skeleton problem to fix
 * here; the actual bug was this component's own `if (recommendations.length
 * === 0) return null` guard, which made it (and the space it needed)
 * disappear from the DOM entirely for the whole wait, then mount abruptly
 * once data arrived. Fixed by tracking real load status
 * (`useAlertRefreshStatus()`, backed by a new `AlertRefreshStatus` on the
 * same service — see that file's own doc comment) and always rendering the
 * outer card shell, swapping only the BODY between a skeleton
 * (`CommandCenterSkeleton`, shaped like the real two-group layout, not a
 * generic rectangle), a real error state with Retry, and the real content —
 * never absent, never `null`, while data is in flight.
 */
export function TodaysTopInsight({ logoMap }: { logoMap: Record<string, ProjectLogoEntry> }) {
  const status = useAlertRefreshStatus();
  const alerts = useEcosystemIntelligenceAlerts();
  const { alerts: rawAlerts } = useAlerts();
  const recommendations = buildRecommendations(alerts, rawAlerts, MAX_RECOMMENDATIONS);
  const signature = recommendationSetSignature(recommendations.map((item) => item.projectId));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== "ready" || recommendations.length === 0) return;
    // `setTimeout`, not `requestAnimationFrame`: this is a one-time
    // localStorage read, not animation timing, and rAF callbacks are
    // paused for as long as the tab is backgrounded/non-visible — verified
    // live that this genuinely broke the dismiss check on a real reload
    // (`document.visibilityState === "hidden"` at mount). A `setTimeout`
    // still satisfies the lint rule against a synchronous `setState` call
    // in an effect body, without that pause.
    const timer = setTimeout(() => {
      const record = readDismissed();
      setDismissed(record?.date === todayKey() && record.signature === signature);
    }, 0);
    return () => clearTimeout(timer);
  }, [status, recommendations.length, signature]);

  // The one intentional exception to "always mount": the user's own,
  // explicit "Hide Today" action (below) — unrelated to loading state, and
  // out of this task's scope (Requirement 9: don't touch anything but
  // loading UX). Loading/error/empty never reach this branch, since
  // `dismissed` can only ever become `true` once real data is `"ready"`.
  if (status === "ready" && dismissed) return null;

  const topOpportunities = recommendations.filter((item) => item.direction === "up");
  const watchClosely = recommendations.filter((item) => item.direction === "warning");

  function handleDismiss() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify({ date: todayKey(), signature }));
    } catch {
      // Intentionally swallowed — worst case the card reappears next reload.
    }
    setDismissed(true);
  }

  return (
    <div className={cn("flex flex-col gap-2 p-4 sm:p-5", GLASS_SURFACE_STATIC)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* V2-UX-003 — measured live: this title rendered at 12px, smaller
            than every other widget title on the page (all 14px) despite
            this section's own doc comment calling it "the most
            decision-relevant content on the page." Brought to parity with
            the standard widget-title size instead of leaving its most
            important section visually the least prominent; dropped
            uppercase/tracking too, since `DashboardSectionLabel` (the tier
            grouping label) now owns that "small structural label" signature
            — keeping both here would blur which one this is. The
            accent color stays as the one legitimate "this is AI content"
            signal. */}
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-radar-primary dark:text-radar-accent">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          AI Command Center
        </span>
        {/* UX Polish, Part 2 — "Hide Today" replaces a bare icon-only "Dismiss"
            X: it states exactly what the action does (hidden until the
            recommended set changes or a new calendar day — see
            `handleDismiss` above), not a vague "got it"/"done" that would
            misreport the user as having acted on the recommendations
            rather than just hiding them. Only offered once there's a real
            recommendation set to hide — a skeleton/error/empty state has
            nothing meaningful to dismiss. */}
        {status === "ready" && recommendations.length > 0 && (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
          >
            <EyeOff className="size-3 shrink-0" aria-hidden="true" />
            Hide Today
          </button>
        )}
      </div>

      {status === "loading" && <CommandCenterSkeleton />}

      {/* V1-FIX-003, Requirement 8 — `min-h-[268px]` reserves the same body
          height the skeleton/loaded content occupies below the header
          (live-measured: skeleton 307px total - header/gap ≈ 271px body),
          so an error (or a genuinely empty day, below) never shrinks the
          card and shifts everything beneath it — the exact bug this whole
          fix exists to prevent, just triggered by a different real state
          instead of the loading transition. */}
      {status === "error" && (
        <FadeIn>
          <div className="flex min-h-[268px] flex-col items-center justify-center gap-2 border-t border-radar-primary/10 pt-2 text-center dark:border-white/10">
            <p className="text-sm text-radar-light-muted dark:text-radar-muted">We couldn&apos;t load today&apos;s intelligence.</p>
            <button
              type="button"
              onClick={() => void alertService.refreshAlerts()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
            >
              <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
              Retry
            </button>
          </div>
        </FadeIn>
      )}

      {status === "ready" && recommendations.length === 0 && (
        <FadeIn>
          <div className="flex min-h-[268px] flex-col items-center justify-center border-t border-radar-primary/10 pt-2 text-center dark:border-white/10">
            <p className="text-sm text-radar-light-muted dark:text-radar-muted">
              No notable signals to highlight right now — check back as today&apos;s activity accrues.
            </p>
          </div>
        </FadeIn>
      )}

      {status === "ready" && recommendations.length > 0 && (
        <FadeIn>
          <div className="flex flex-col gap-2">
            {topOpportunities.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-radar-primary/10 pt-2 dark:border-white/10">
                <p className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Top opportunities</p>
                <RecommendationGrid items={topOpportunities} logoMap={logoMap} />
              </div>
            )}

            {watchClosely.length > 0 && (
              <div className={cn("flex flex-col gap-1", topOpportunities.length === 0 && "border-t border-radar-primary/10 pt-2 dark:border-white/10")}>
                <p className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-radar-warning uppercase">
                  <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                  Watch closely
                </p>
                <RecommendationGrid items={watchClosely} logoMap={logoMap} />
              </div>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
