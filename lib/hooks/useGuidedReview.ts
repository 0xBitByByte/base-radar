"use client";

/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — the one hook the
 * Guided Review UI reads through. Wraps `lib/guided-review/storage.ts` with
 * `useSyncExternalStore`, the same subscription shape `useWalletHistory()`
 * already uses over its own `localStorage`-backed store.
 */

import { useCallback, useSyncExternalStore } from "react";

import {
  finishReview,
  getReviewState,
  jumpToReviewStep,
  nextReviewStep,
  previousReviewStep,
  resetReview,
  subscribeToReviewState,
} from "@/lib/guided-review/storage";
import { REVIEW_STEPS } from "@/lib/guided-review/steps";
import type { ReviewState } from "@/lib/guided-review/types";

export type UseGuidedReviewResult = {
  state: ReviewState;
  steps: typeof REVIEW_STEPS;
  currentStep: (typeof REVIEW_STEPS)[number];
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Real count of distinct completed steps, out of the fixed total — never a re-derived percentage stored separately. */
  progress: { completed: number; total: number };
  /** `true` once a review has been started but not yet finished — the Dashboard shortcut's "Resume" vs "Start" signal. */
  inProgress: boolean;
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  finish: () => void;
  reset: () => void;
};

const DEFAULT_STATE: ReviewState = { currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null };

function getServerSnapshot(): ReviewState {
  return DEFAULT_STATE;
}

export function useGuidedReview(): UseGuidedReviewResult {
  const state = useSyncExternalStore(subscribeToReviewState, getReviewState, getServerSnapshot);

  const next = useCallback(() => nextReviewStep(), []);
  const previous = useCallback(() => previousReviewStep(), []);
  const jumpTo = useCallback((index: number) => jumpToReviewStep(index), []);
  const finish = useCallback(() => finishReview(), []);
  const reset = useCallback(() => resetReview(), []);

  return {
    state,
    steps: REVIEW_STEPS,
    currentStep: REVIEW_STEPS[state.currentStepIndex],
    isFirstStep: state.currentStepIndex === 0,
    isLastStep: state.currentStepIndex === REVIEW_STEPS.length - 1,
    progress: { completed: state.completedStepIds.length, total: REVIEW_STEPS.length },
    inProgress: state.startedAt !== null && state.completedAt === null,
    next,
    previous,
    jumpTo,
    finish,
    reset,
  };
}
