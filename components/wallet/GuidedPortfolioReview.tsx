"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UseGuidedReviewResult } from "@/lib/hooks/useGuidedReview";
import type { UseWalletAutomationResult } from "@/lib/hooks/useWalletAutomation";
import type { UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { AnalyticsHighlight, WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { ReviewStepId } from "@/lib/guided-review/types";
import { GLASS_CARD_SURFACE } from "@/components/ui/glassStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { AllocationAnalysisSection, ExecutiveSummarySection, PortfolioHealthSection, RecommendationsSection, RiskAnalysisSection } from "@/components/wallet/WalletIntelligenceSections";
import { AutomationStatusSection } from "@/components/wallet/WalletAutomationSections";
import { AnalyticsHighlightsCard, AnalyticsSummarySection } from "@/components/wallet/WalletAnalyticsSections";
import { HistoricalPortfolioSection } from "@/components/wallet/WalletHistorySections";

/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — a step-by-step
 * WALKTHROUGH over already-built Wallet sections, never a new view of the
 * data. Each step below renders the EXACT SAME component this page's other
 * surfaces already use (`PortfolioHealthSection`, `RiskAnalysisSection`,
 * etc.) — this file owns only step sequencing and navigation, never a
 * recomputation or a second rendering of any metric.
 */

type StepContentProps = {
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  automation: UseWalletAutomationResult;
  analytics: WalletAnalytics;
  walletHistory: UseWalletHistoryResult;
  highlights: AnalyticsHighlight[];
  digest: MonthlyDigest | null;
  story: PortfolioStory | null;
};

function StepContent({ stepId, data }: { stepId: ReviewStepId; data: StepContentProps }) {
  const { intelligence, ai, automation, analytics, walletHistory, highlights, digest, story } = data;

  switch (stepId) {
    case "health":
      return intelligence ? <PortfolioHealthSection intelligence={intelligence} /> : <EmptyState icon={Wallet} title="No holdings yet." description="Connect a wallet with real holdings to see its health score." />;
    case "risk":
      return intelligence ? <RiskAnalysisSection intelligence={intelligence} /> : <EmptyState icon={Wallet} title="No holdings yet." description="Connect a wallet with real holdings to see its risk analysis." />;
    case "diversification":
      return intelligence ? <AllocationAnalysisSection intelligence={intelligence} /> : <EmptyState icon={Wallet} title="No holdings yet." description="Connect a wallet with real holdings to see its allocation." />;
    case "automation":
      return <AutomationStatusSection automation={automation} />;
    case "analytics":
      return (
        <div className="flex flex-col gap-4">
          <AnalyticsHighlightsCard analytics={analytics} />
          <AnalyticsSummarySection analytics={analytics} />
        </div>
      );
    case "history":
      return <HistoricalPortfolioSection walletHistory={walletHistory} analytics={analytics} highlights={highlights} digest={digest} story={story} />;
    case "recommendations":
      return intelligence ? <RecommendationsSection intelligence={intelligence} /> : <EmptyState icon={Wallet} title="No holdings yet." description="Connect a wallet with real holdings to see recommendations." />;
    case "summary":
      return (
        <div className="flex flex-col gap-4">
          {ai ? (
            <ExecutiveSummarySection ai={ai} />
          ) : (
            <EmptyState icon={ClipboardCheck} title="No summary yet." description="Connect a wallet with real holdings to see its executive summary." />
          )}
        </div>
      );
    default:
      return null;
  }
}

export function GuidedPortfolioReview({
  review,
  intelligence,
  ai,
  automation,
  analytics,
  walletHistory,
  highlights,
  digest,
  story,
  className,
}: { review: UseGuidedReviewResult } & StepContentProps & { className?: string }) {
  const { steps, state, currentStep, isFirstStep, isLastStep, progress } = review;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className={cn("flex flex-col gap-3 p-5", GLASS_CARD_SURFACE)}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-radar-light-text dark:text-radar-white">Guided Portfolio Review</h1>
          <span className="text-xs text-radar-light-muted dark:text-radar-muted">
            {progress.completed} of {progress.total} steps visited
          </span>
        </div>

        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Review steps">
          {steps.map((step, index) => {
            const isCurrent = index === state.currentStepIndex;
            const isCompleted = state.completedStepIds.includes(step.id);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => review.jumpTo(index)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                    isCurrent
                      ? "border-radar-primary bg-radar-primary/10 text-radar-primary dark:border-radar-accent dark:bg-radar-accent/10 dark:text-radar-accent"
                      : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
                  )}
                >
                  {isCompleted && <CheckCircle2 className="size-3 shrink-0 text-radar-success" aria-hidden="true" />}
                  {index + 1}. {step.title}
                </button>
              </li>
            );
          })}
        </ol>

        {state.completedAt && (
          <p className="flex items-center gap-1.5 text-[11px] text-radar-success">
            <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
            Last completed <RelativeTime iso={state.completedAt} />
          </p>
        )}
      </div>

      <div className={cn("flex flex-col gap-3 p-5", GLASS_CARD_SURFACE)}>
        <div>
          <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{currentStep.title}</h2>
          <p className="text-xs text-radar-light-muted dark:text-radar-muted">{currentStep.description}</p>
        </div>

        <StepContent stepId={currentStep.id} data={{ intelligence, ai, automation, analytics, walletHistory, highlights, digest, story }} />

        <div className="flex items-center justify-between gap-2 border-t border-radar-light-border pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={review.previous}
            disabled={isFirstStep}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-radar-light-border px-3.5 py-2 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5",
              isFirstStep && "cursor-not-allowed opacity-50"
            )}
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={review.reset}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Start Over
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={review.finish}
                className="flex items-center gap-1.5 rounded-xl bg-radar-primary px-3.5 py-2 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={review.next}
                className="flex items-center gap-1.5 rounded-xl bg-radar-primary px-3.5 py-2 text-xs font-medium text-white outline-none transition-colors hover:bg-radar-primary/90 focus-visible:ring-2 focus-visible:ring-radar-primary/50"
              >
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
