/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — persistence for
 * review PROGRESS ONLY (current step, completed steps, started/completed
 * timestamps), never portfolio data itself — see `types.ts`'s own doc
 * comment. Same versioned-`localStorage` envelope, module-level cache +
 * subscriber pattern `lib/personalization/preferences.ts` already
 * established: one in-memory `cached` snapshot as the source of truth,
 * every mutation updates it and notifies subscribers synchronously, missing
 * or corrupted data falls back to a fresh, never-started state rather than
 * throwing.
 */

import { REVIEW_STEPS } from "@/lib/guided-review/steps";
import type { ReviewState, ReviewStepId } from "@/lib/guided-review/types";

const STORAGE_KEY = "base-radar:guided-review";
const VERSION = 1;

const REVIEW_STEP_ID_SET = new Set<string>(REVIEW_STEPS.map((step) => step.id));

const DEFAULT_STATE: ReviewState = { currentStepIndex: 0, completedStepIds: [], startedAt: null, completedAt: null };

type PersistedReviewState = { version: number; state: ReviewState };

function isValidState(value: unknown): value is ReviewState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ReviewState>;
  return (
    typeof candidate.currentStepIndex === "number" &&
    candidate.currentStepIndex >= 0 &&
    candidate.currentStepIndex < REVIEW_STEPS.length &&
    Array.isArray(candidate.completedStepIds) &&
    candidate.completedStepIds.every((id) => typeof id === "string" && REVIEW_STEP_ID_SET.has(id)) &&
    (candidate.startedAt === null || typeof candidate.startedAt === "string") &&
    (candidate.completedAt === null || typeof candidate.completedAt === "string")
  );
}

function readState(): ReviewState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedReviewState> | null;
    if (typeof parsed !== "object" || parsed === null || parsed.version !== VERSION || !isValidState(parsed.state)) return DEFAULT_STATE;
    return parsed.state;
  } catch {
    return DEFAULT_STATE;
  }
}

/** Best-effort — same "in-memory stays correct for this tab even if the write fails" contract as `lib/personalization/preferences.ts`. */
function writeState(state: ReviewState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, state } satisfies PersistedReviewState));
  } catch {
    // Intentionally swallowed.
  }
}

let cached: ReviewState = readState();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function persist(next: ReviewState): void {
  cached = next;
  writeState(next);
  notify();
}

function markCompleted(state: ReviewState, stepId: ReviewStepId): ReviewState {
  return state.completedStepIds.includes(stepId) ? state : { ...state, completedStepIds: [...state.completedStepIds, stepId] };
}

export function getReviewState(): ReviewState {
  return cached;
}

/** Jumps to any step directly (Jump). Marks the step being LEFT as completed and stamps `startedAt` on first real navigation, same as `next()`. */
export function jumpToReviewStep(index: number): void {
  const clamped = Math.max(0, Math.min(index, REVIEW_STEPS.length - 1));
  const startedAt = cached.startedAt ?? new Date().toISOString();
  const withCompletion = markCompleted(cached, REVIEW_STEPS[cached.currentStepIndex].id);
  persist({ ...withCompletion, currentStepIndex: clamped, startedAt });
}

export function nextReviewStep(): void {
  jumpToReviewStep(cached.currentStepIndex + 1);
}

export function previousReviewStep(): void {
  jumpToReviewStep(cached.currentStepIndex - 1);
}

/** Marks every step completed and stamps `completedAt` — only ever called from the real Summary step's own "Finish" action. */
export function finishReview(): void {
  const withCompletion = markCompleted(cached, REVIEW_STEPS[cached.currentStepIndex].id);
  persist({ ...withCompletion, completedAt: new Date().toISOString() });
}

/** A fresh review — clears progress but never touches any portfolio data (there is none to clear here). */
export function resetReview(): void {
  persist(DEFAULT_STATE);
}

export function subscribeToReviewState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
