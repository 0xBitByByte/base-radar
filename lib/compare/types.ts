/**
 * PR-091 (Compare Platform) — domain types for the Compare list: a small,
 * local-device set of project ids a user is currently comparing. This is
 * deliberately NOT a new intelligence pipeline — the list holds only real
 * registry project ids; every field shown in the comparison itself comes
 * straight from the existing `LiveProject` (`lib/projects/types.ts`) and
 * `SmartCollectionResult` (`lib/smart-collections/types.ts`) shapes, never
 * re-derived or recomputed here.
 */

/** A comparison only reads clearly with a small, fixed number of columns — matches this app's other small, deliberately-closed limits (`MAX_ALERTS`, `MAX_MATCHES`). */
export const MAX_COMPARE_PROJECTS = 4;

export type CompareState = {
  /** Ordered, de-duplicated real registry project ids — insertion order, so the most recently added project is always last. */
  projectIds: string[];
};
