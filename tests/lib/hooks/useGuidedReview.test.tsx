import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useGuidedReview } from "@/lib/hooks/useGuidedReview";
import { REVIEW_STEPS } from "@/lib/guided-review/steps";

const STORAGE_KEY = "base-radar:guided-review";

describe("useGuidedReview", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("starts on step 0 with real, non-fabricated progress", () => {
    const { result } = renderHook(() => useGuidedReview());
    expect(result.current.currentStep.id).toBe(REVIEW_STEPS[0].id);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.progress).toEqual({ completed: 0, total: REVIEW_STEPS.length });
    expect(result.current.inProgress).toBe(false);
  });

  it("next() re-renders with the real next step and marks inProgress true", () => {
    const { result } = renderHook(() => useGuidedReview());
    act(() => result.current.next());
    expect(result.current.currentStep.id).toBe(REVIEW_STEPS[1].id);
    expect(result.current.inProgress).toBe(true);
  });

  it("jumpTo() and finish() reach the real Summary step and stamp completion", () => {
    const { result } = renderHook(() => useGuidedReview());
    act(() => result.current.jumpTo(REVIEW_STEPS.length - 1));
    expect(result.current.isLastStep).toBe(true);
    act(() => result.current.finish());
    expect(result.current.state.completedAt).not.toBeNull();
    expect(result.current.inProgress).toBe(false);
  });

  it("reset() returns to a genuinely fresh state", () => {
    const { result } = renderHook(() => useGuidedReview());
    act(() => result.current.next());
    act(() => result.current.reset());
    expect(result.current.currentStep.id).toBe(REVIEW_STEPS[0].id);
    expect(result.current.progress.completed).toBe(0);
  });
});
