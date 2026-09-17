"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  /** PR-086.04 — set when this option has no real backing data (e.g. a 30D window with no 30-day figure). Rendered as a genuinely inert control — grey text, reduced opacity, `cursor-not-allowed`, no hover reaction, no click, never selectable — never hidden or relabeled, so the full 24H/7D/30D set always reads as one consistent capsule regardless of which windows a given project actually has data for. */
  disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the control group, e.g. "Performance window". */
  "aria-label": string;
  className?: string;
  /** `"sm"` — tighter padding/font for a control embedded in an already-dense card cell (e.g. `LiveProjectCard`'s momentum tile). Defaults to `"md"`, this component's original sizing. */
  size?: "sm" | "md";
};

/**
 * PR-086.03 — a small, generic segmented tab control (e.g. "24H · 7D ·
 * 30D") with a sliding active-option indicator. Reuses the exact
 * measure-`offsetLeft`/`offsetWidth`-off-real-DOM-refs technique
 * `ProfileSectionNav.tsx`'s own sliding indicator already established for
 * its sticky in-page nav — not a new animation system, the same one applied
 * to a smaller, reusable control. First built for `ProjectCard`'s inline
 * 24H/7D/30D performance switch; generic enough for any small fixed set of
 * mutually-exclusive options.
 *
 * PR-086.04 — two fixes, both found live inside `LiveProjectCard`, which
 * renders its whole content tree under `pointer-events-none` (only specific
 * sub-elements opt back in, e.g. the social-icon row) so the underlying
 * card-wide `Link` stays the click target everywhere else: (1) `pointer-
 * events-auto` on this root — without it every click here silently fell
 * through to that `Link` and navigated to Project Details instead of
 * switching tabs, since a `pointer-events: none` ancestor stops a button
 * from ever becoming the click target at all, before `onClick`/
 * `stopPropagation` even get a chance to run. (2) each button is now a
 * fixed width (`w-7`/`w-8`) instead of sizing to its own label's text
 * width — "24H"/"30D" (3 characters) and "7D" (2) previously produced
 * visibly uneven button widths and a capsule whose total width changed
 * between projects; now every instance of this control has identical
 * dimensions everywhere it's used.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, className, size = "md", ...aria }: SegmentedControlProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const button = buttonRefs.current[value];
    if (!button) return;
    setIndicatorStyle({ left: button.offsetLeft, width: button.offsetWidth });
  }, [value, options]);

  return (
    <div
      role="group"
      aria-label={aria["aria-label"]}
      className={cn(
        "pointer-events-auto relative inline-flex items-center gap-0.5 rounded-lg border border-radar-light-border bg-radar-light-surface p-0.5 dark:border-white/10 dark:bg-white/[0.03]",
        className
      )}
    >
      {indicatorStyle && (
        <span
          aria-hidden="true"
          className={cn(
            // PR-086.06 — the selected option needs to be identifiable at a
            // glance, not just by a slightly different text color: a real
            // tinted fill plus a border gives the pill actual definition
            // against the capsule, in both themes.
            "absolute top-0.5 bottom-0.5 z-0 rounded-md border border-radar-primary/30 bg-radar-primary/15 shadow-sm dark:border-radar-primary/40 dark:bg-radar-primary/20",
            !prefersReducedMotion && "transition-[left,width] duration-200 ease-out"
          )}
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      )}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[option.value] = el;
            }}
            type="button"
            disabled={option.disabled}
            aria-pressed={isActive}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange(option.value);
            }}
            className={cn(
              "relative z-10 rounded-md text-center font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              size === "sm" ? "w-7 px-1 py-0.5 text-[10px]" : "w-8 px-1.5 py-1 text-[11px]",
              option.disabled
                ? "cursor-not-allowed text-radar-light-muted opacity-40 dark:text-radar-muted"
                : isActive
                  ? // PR-086.06 — heavier weight + brand color, matched to the
                    // indicator pill's new tint, so the selected option reads
                    // as clearly distinct rather than a near-identical text
                    // color shift against a barely-different pill.
                    "font-semibold text-radar-primary dark:text-radar-accent"
                  : "text-radar-light-muted hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
