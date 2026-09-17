"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, type LucideIcon } from "lucide-react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type FloatingNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type FloatingSectionNavProps = {
  sections: readonly FloatingNavSection[];
  /** Scroll distance (px) before the widget appears. Defaults to the approved ~500px. */
  revealAfter?: number;
};

/**
 * PR-087 — one reusable floating "Back to Top + jump to section" widget for
 * every long page in the app, replacing what used to be two independent,
 * near-duplicate implementations (`DirectoryFloatingNav`'s own inline markup,
 * and the Project Profile page having no bottom-corner nav at all — only
 * `ProfileSectionNav`'s sticky top bar). Default state is a single circular
 * Back-to-Top button; a device with real hover expands the section panel on
 * `mouseenter` and collapses it again on `mouseleave` — no click required.
 * A touch device (`(hover: none)`, detected once on mount) has no hover
 * state to expand from, so there the same button becomes a tap-to-toggle
 * control instead, and "Back to Top" moves into the panel as its own row so
 * it stays reachable. Active-section highlighting reuses the exact
 * `IntersectionObserver` recipe `ProfileSectionNav` already established
 * (same rootMargin, same "topmost intersecting entry wins" rule) rather than
 * inventing a second scrollspy implementation.
 */
export function FloatingSectionNav({ sections, revealAfter = 500 }: FloatingSectionNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  // Starts `false` to match the server-rendered markup exactly (the lazy
  // initializer this used to be re-runs on the client's hydration render too,
  // not just once on the server — on a touch device that made it evaluate
  // `true` before hydration even finished, a genuine child-node mismatch:
  // the "Back to Top" row below is only in the DOM when `isTouch` is true,
  // so the server's markup (always `false`) and the client's first render
  // (`true`, on touch) disagreed on whether that button exists at all).
  // Read for real in the effect below instead, after hydration is done.
  const [isTouch, setIsTouch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // `requestAnimationFrame`, not a synchronous call, matching the same
    // escape hatch `CollapsibleSection`'s own post-hydration correction
    // already uses — satisfies the lint rule against direct setState calls
    // in an effect body, and keeps this off the hydration render itself.
    const frame = requestAnimationFrame(() => {
      setIsTouch(window.matchMedia("(hover: none)").matches);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > revealAfter);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [revealAfter]);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.filter((entry) => entry.isIntersecting);
        if (inView.length === 0) return;
        const topMost = inView.reduce((closest, entry) =>
          entry.boundingClientRect.top < closest.boundingClientRect.top ? entry : closest
        );
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Click-outside collapses the panel on touch devices, matching a
  // standard tap-to-open-tap-away-to-close popover — desktop never needs
  // this since `onMouseLeave` already handles collapsing there.
  useEffect(() => {
    if (!isTouch || !expanded) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isTouch, expanded]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [prefersReducedMotion]);

  const scrollToSection = useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      setExpanded(false);
    },
    [prefersReducedMotion]
  );

  // PR-089 — Esc collapses this widget's own panel, and a `g` then `t`/`s`
  // chord (GitHub's own convention for "go to") jumps straight to the
  // Trading/Summary sections when this page actually has them — a no-op
  // everywhere else (e.g. the Projects directory's `sections` never include
  // those ids, so the lookup below just finds nothing and does nothing).
  // Deliberately NOT a generic "first letter of every section" scheme: half
  // of this page's own 13 sections share a first letter with another
  // (Trading/Trust/Timeline all start with T, Summary/Sources both start
  // with S), so a generic mnemonic would be ambiguous on the very page this
  // is for — these two bindings are the two the brief actually asked for,
  // nothing broader. Both guard against typing in a real input/textarea/
  // contenteditable, the same guard `ExplorerSearch`'s own `/`-to-focus
  // shortcut already established, so this never fires mid-sentence.
  useEffect(() => {
    let awaitingChord = false;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    function isTypingTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || Boolean(el?.isContentEditable);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Escape") {
        if (expanded) setExpanded(false);
        return;
      }

      if (awaitingChord) {
        awaitingChord = false;
        if (chordTimer) clearTimeout(chordTimer);
        const targetId = event.key === "t" ? "trading" : event.key === "s" ? "summary" : null;
        if (targetId && sections.some((section) => section.id === targetId)) {
          event.preventDefault();
          scrollToSection(targetId);
        }
        return;
      }

      if (event.key === "g") {
        awaitingChord = true;
        chordTimer = setTimeout(() => {
          awaitingChord = false;
        }, 800);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimer) clearTimeout(chordTimer);
    };
  }, [expanded, sections, scrollToSection]);

  function handleButtonClick() {
    if (isTouch) {
      setExpanded((prev) => !prev);
      return;
    }
    scrollToTop();
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed right-5 bottom-5 z-30 flex flex-col items-end gap-2 transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      )}
      // UI Interaction Polish — `onMouseLeave` stays here (on the whole
      // button+panel cluster) so moving the cursor from the button up into
      // the now-open panel to click a section doesn't immediately collapse
      // it; `mouseleave` doesn't fire on moving between descendants, only on
      // truly leaving this box. `onMouseEnter` used to live here too, which
      // was the actual bug: this box's own layout footprint always matches
      // the *expanded* panel's full size (`w-56`, up to `max-h-[60vh]`),
      // even while the panel is only visually collapsed (`opacity-0
      // scale-95`, not removed from flow) — so hovering anywhere in that
      // invisible footprint, nowhere near the visible button, opened the
      // menu. Verified live: dispatching a real hover over the collapsed
      // panel's area (not the button) flipped `expanded` to `true`. Moved
      // onto the button itself below, the only element intentional hover
      // should come from.
      onMouseLeave={() => !isTouch && setExpanded(false)}
    >
      <div
        role="navigation"
        aria-label="Page sections"
        className={cn(
          "flex max-h-[60vh] w-56 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-radar-primary/[0.18] bg-radar-light-card/40 p-1.5 shadow-[0_16px_48px_-12px_rgba(16,34,58,0.3),inset_0_1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-out dark:border-white/10 dark:bg-radar-bg/40 dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
          expanded ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"
        )}
      >
        {isTouch && (
          <button
            type="button"
            onClick={() => {
              scrollToTop();
              setExpanded(false);
            }}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
          >
            <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
            Back to Top
          </button>
        )}
        {sections.map((section) => {
          const isActive = section.id === activeId;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                isActive
                  ? "bg-radar-primary/10 text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
                  : "text-radar-light-muted hover:bg-radar-light-surface hover:text-radar-light-text dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleButtonClick}
        onMouseEnter={() => !isTouch && setExpanded(true)}
        aria-label="Back to top"
        aria-expanded={isTouch ? expanded : undefined}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border border-radar-primary/[0.18] bg-radar-light-card/40 text-radar-light-muted shadow-[0_8px_24px_-8px_rgba(16,34,58,0.35),inset_0_1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-2xl outline-none transition-colors duration-300 hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-radar-bg/45 dark:text-radar-muted dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:hover:text-radar-white",
          expanded && "text-radar-primary dark:text-radar-accent"
        )}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
