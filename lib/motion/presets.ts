import type { Transition } from "framer-motion";

/**
 * PR-079 — a small, named set of `framer-motion` transition presets for
 * this PR's new primitives (`ExpandableMetricCard` and its hover
 * treatment). Existing components (`CollapsibleSection`'s `0.2s`,
 * `SplashScreen`'s `400ms`, `WidgetCard`'s `0.25s`) each hardcode their own
 * timing independently today — this file is not a retrofit of those (real,
 * working code, no user-visible benefit to touching it), it's the seed of a
 * shared vocabulary so future screens (Watchlist, Automation, Compare) that
 * adopt `ExpandableMetricCard` reuse one motion language instead of a
 * fourth independent set of magic numbers.
 */
export const EXPAND_TRANSITION: Transition = { duration: 0.2, ease: "easeOut" };

export const FADE_TRANSITION: Transition = { duration: 0.15, ease: "easeInOut" };

export const HOVER_LIFT: Transition = { duration: 0.15, ease: "easeOut" };
