"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type Section = { id: string; label: string };

/** Matches the landing page's actual section order in `app/page.tsx` — every id here must exist on the page or its dot silently never activates. */
const SECTIONS: Section[] = [
  { id: "hero", label: "Hero" },
  { id: "projects", label: "Projects" },
  { id: "ai", label: "AI Intelligence" },
  { id: "why", label: "Why Base Radar" },
  { id: "roadmap", label: "Roadmap" },
  { id: "features", label: "Features" },
  { id: "site-footer", label: "Footer" },
];

/**
 * "Sticky Scroll Progress" (PR9.3 §14) — a minimal fixed-right dot rail
 * tracking which landing-page section is currently in view, via
 * `IntersectionObserver` (not scroll-position math, which drifts under
 * variable section heights). Desktop-only (`lg:flex`) — on narrower
 * viewports it would either overlap content or need its own responsive
 * repositioning, and the brief calls for "very minimal," not another
 * breakpoint-specific UI to maintain.
 */
export function ScrollProgress() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const prefersReducedMotion = useReducedMotion();
  const ratiosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratiosRef.current.set(entry.target.id, entry.intersectionRatio);
        }
        let bestId = activeId;
        let bestRatio = 0;
        for (const [id, ratio] of ratiosRef.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestRatio > 0) setActiveId(bestId);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClick(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Section progress"
      className="fixed top-1/2 right-6 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex"
    >
      {SECTIONS.map((section) => {
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => handleClick(section.id)}
            aria-label={`Scroll to ${section.label}`}
            aria-current={isActive ? "true" : undefined}
            className="group relative flex size-4 items-center justify-center"
          >
            <motion.span
              animate={{ scale: isActive ? 1 : 0.55, opacity: isActive ? 1 : 0.35 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "size-1.5 rounded-full bg-radar-light-text dark:bg-radar-white",
                isActive && "bg-radar-primary dark:bg-radar-accent"
              )}
            />
            <span className="pointer-events-none absolute right-6 rounded-md border border-radar-light-border bg-radar-light-card px-2 py-1 text-[10.5px] whitespace-nowrap text-radar-light-text opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 dark:border-white/10 dark:bg-radar-card dark:text-radar-white">
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
