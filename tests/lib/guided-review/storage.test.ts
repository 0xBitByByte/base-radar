import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REVIEW_STEPS } from "@/lib/guided-review/steps";

const STORAGE_KEY = "base-radar:guided-review";

async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/guided-review/storage");
}

describe("guided-review storage — persistence across a simulated browser refresh", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("a fresh review starts at step 0, nothing completed, never started/completed", async () => {
    const storage = await freshStorageModule();
    expect(storage.getReviewState()).toEqual({ currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null });
  });

  it("nextReviewStep() advances the index, marks the left step completed, and stamps startedAt on first real navigation", async () => {
    const storage = await freshStorageModule();
    storage.nextReviewStep();
    const state = storage.getReviewState();
    expect(state.currentStepIndex).toBe(1);
    expect(state.completedStepIds).toEqual([REVIEW_STEPS[0].id]);
    expect(state.startedAt).not.toBeNull();
  });

  it("previousReviewStep() moves back and never goes below 0", async () => {
    const storage = await freshStorageModule();
    storage.previousReviewStep();
    expect(storage.getReviewState().currentStepIndex).toBe(0);

    storage.nextReviewStep();
    storage.nextReviewStep();
    storage.previousReviewStep();
    expect(storage.getReviewState().currentStepIndex).toBe(1);
  });

  it("jumpToReviewStep() clamps to a valid index and never exceeds the last real step", async () => {
    const storage = await freshStorageModule();
    storage.jumpToReviewStep(999);
    expect(storage.getReviewState().currentStepIndex).toBe(REVIEW_STEPS.length - 1);

    storage.jumpToReviewStep(-5);
    expect(storage.getReviewState().currentStepIndex).toBe(0);
  });

  it("finishReview() marks the current step completed and stamps a real completedAt", async () => {
    const storage = await freshStorageModule();
    storage.jumpToReviewStep(REVIEW_STEPS.length - 1);
    storage.finishReview();
    const state = storage.getReviewState();
    expect(state.completedAt).not.toBeNull();
    expect(state.completedStepIds).toContain(REVIEW_STEPS[REVIEW_STEPS.length - 1].id);
  });

  it("resetReview() returns to a genuinely fresh state", async () => {
    const storage = await freshStorageModule();
    storage.nextReviewStep();
    storage.finishReview();
    storage.resetReview();
    expect(storage.getReviewState()).toEqual({ currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null });
  });

  it("survives a simulated refresh — fresh module instance, same localStorage", async () => {
    const first = await freshStorageModule();
    first.nextReviewStep();
    first.nextReviewStep();

    const second = await freshStorageModule();
    expect(second.getReviewState().currentStepIndex).toBe(2);
    expect(second.getReviewState().completedStepIds).toEqual([REVIEW_STEPS[0].id, REVIEW_STEPS[1].id]);
  });

  it("corrupted persisted data falls back to a fresh state, never throws", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    const storage = await freshStorageModule();
    expect(storage.getReviewState()).toEqual({ currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null });
  });

  it("subscribeToReviewState() notifies listeners synchronously on every mutation", async () => {
    const storage = await freshStorageModule();
    const listener = vi.fn();
    const unsubscribe = storage.subscribeToReviewState(listener);
    storage.nextReviewStep();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    storage.nextReviewStep();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never stores portfolio data — the persisted envelope only ever carries step/progress fields", async () => {
    const storage = await freshStorageModule();
    storage.nextReviewStep();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(Object.keys(parsed.state).sort()).toEqual(["completedAt", "completedStepIds", "currentStepIndex", "startedAt"]);
  });
});
