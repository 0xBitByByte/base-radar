"use client";

import { useMemo } from "react";
import { BookOpenCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useAIWorkspaceAsk } from "@/lib/hooks/useAIWorkspaceAsk";
import { useAIWatch } from "@/lib/hooks/useAIWatch";
import { buildWorkspaceView } from "@/lib/ai-workspace/compose";
import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import { EvidenceClaimCard } from "@/components/ai-workspace/EvidenceClaimCard";
import { AIAskPanel } from "@/components/ai-workspace/AIAskPanel";
import { AIWatchPanel } from "@/components/ai-workspace/AIWatchPanel";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";

/**
 * PR-090.01 (AI Workspace — Evidence Dashboard). Reads TWO canonical
 * sources, each already computed exactly once elsewhere in the app:
 *
 * - `initialBriefing` — the AI Intelligence Engine's `DailyIntelligenceBriefing`,
 *   awaited ONCE by `app/dashboard/ai-workspace/page.tsx` via
 *   `getCurrentDailyIntelligenceBriefing()`, the SAME `cache()`-wrapped
 *   Server Action `app/dashboard/projects/[slug]/ai/page.tsx` already
 *   calls (via `getProjectAIIntelligence()`) — never a second generation
 *   run.
 * - `useDailyBrief()` — the SAME `useSyncExternalStore` hook
 *   `/dashboard/brief` itself reads through, subscribed to the SAME
 *   `lib/alerts/service.ts` store. No wallet hook, no Portfolio hook, no
 *   provider call happens in this file — exactly the "inject or compose
 *   canonical data once" rule from the Wallet AI Chat bug fix.
 *
 * `dailyBrief === null` is the one real transient state
 * (`useDailyBrief()`'s own `getServerSnapshot` returns `null` to avoid a
 * hydration mismatch — see that hook's own doc comment) — rendered as a
 * real loading state, not an empty one, since `getDailyBrief()` itself
 * never returns `null` once the client store is live.
 */
export function AIWorkspaceView({ initialBriefing }: { initialBriefing: DailyIntelligenceBriefing | null }) {
  const dailyBrief = useDailyBrief();
  const isHydrating = dailyBrief === null;

  const view = useMemo(() => buildWorkspaceView(initialBriefing, dailyBrief), [initialBriefing, dailyBrief]);
  const ask = useAIWorkspaceAsk(view);
  const watch = useAIWatch(view);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <BookOpenCheck className="size-5 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-radar-light-text dark:text-radar-white">AI Workspace</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-radar-light-muted dark:text-radar-muted">
          What Base Radar currently believes about the Base ecosystem, and why. Evidence, source attribution, freshness, and confidence are shown where available — AI Intelligence Briefs always require at least one real, cited signal to exist at all, and when an upstream source doesn&apos;t retain a detail for a finding, this page says so directly instead of guessing. This is a read-only evidence dashboard, not a chat assistant.
        </p>
        {view.generatedAt && (
          <p className="mt-2 text-xs text-radar-light-muted dark:text-radar-muted">
            Updated <RelativeTime iso={view.generatedAt} />
          </p>
        )}
      </header>

      <AIWatchPanel watch={watch} />

      {view.sections.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`} className={cn("flex flex-col gap-4 p-6", GLASS_CARD_SURFACE)}>
          <div>
            <h2 id={`${section.id}-heading`} className="text-sm font-semibold text-radar-light-text dark:text-radar-white">
              {section.title}
            </h2>
            <p className="mt-0.5 text-xs text-radar-light-muted dark:text-radar-muted">{section.description}</p>
          </div>

          {section.id === "daily-brief" && isHydrating ? (
            <div className="flex flex-col gap-2" role="status" aria-label={`Loading ${section.title}`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-radar-light-surface dark:bg-white/5" />
              ))}
            </div>
          ) : section.claims.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title="Nothing here yet." description={section.emptyReason} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {section.claims.map((claim) => (
                <EvidenceClaimCard key={claim.id} claim={claim} />
              ))}
            </ul>
          )}
        </section>
      ))}

      <AIAskPanel ask={ask} />
    </div>
  );
}
