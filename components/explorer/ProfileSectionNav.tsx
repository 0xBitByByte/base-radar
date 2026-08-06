"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * PR-073 refinement pass — reordered to match the page's new investor-first
 * reading order (verdict -> market/on-chain data -> evidence & history), and
 * "Trust" (`trust-center`) and "Timeline" (`ProfileActivityFeed`, previously
 * missing its own anchor) added so every real section a reader lands on has
 * a working nav entry.
 */
// PR-079 Phase 6 — order now matches the page's actual zone order (Overview
// -> Intelligence -> Market -> Trust -> Governance -> Activity -> Sources)
// so the nav's left-to-right link order lines up with top-to-bottom scroll
// position. `tvl` removed (absorbed into the `price` card's Overview metric
// cards, Section 3); `community`/`developer` merged into one `intelligence`
// id (Section 4's "Project Intelligence").
const SECTIONS = [
  { id: "price", label: "Price" },
  { id: "summary", label: "Summary" },
  { id: "overview", label: "Health & Trust" },
  { id: "why-it-matters", label: "Why It Matters" },
  { id: "intelligence", label: "Intelligence" },
  { id: "contracts", label: "Contracts" },
  { id: "network", label: "Network" },
  { id: "trust-center", label: "Trust" },
  { id: "governance", label: "Governance" },
  { id: "recent-highlights", label: "Highlights" },
  { id: "timeline", label: "Timeline" },
  { id: "sources", label: "Sources" },
] as const;

/**
 * PR11.1 Part 7, active-highlighting added in PR11.2 Part 8 — a lightweight
 * sticky in-page nav, sitting directly under the Hero and just below the
 * always-sticky `Topbar` (`top-16` clears its `h-16`). No third-party
 * scroll library: plain anchor links + native `scrollIntoView` for
 * navigation, and the native `IntersectionObserver` (also no library) for
 * tracking which section is currently in view. The active-link treatment
 * reuses `SidebarItem.tsx`'s exact active-state recipe
 * (`bg-radar-primary/10 ... text-radar-primary dark:bg-radar-primary/15
 * dark:text-radar-accent`) so this nav's "current" state reads identically
 * to the app's main sidebar rather than inventing a second convention.
 */
export function ProfileSectionNav() {
  const prefersReducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((closest, entry) =>
          entry.boundingClientRect.top < closest.boundingClientRect.top ? entry : closest
        );
        setActiveId(topMost.target.id);
      },
      // Treats a section as "active" once it's scrolled up past the sticky
      // Topbar+nav band and while it still occupies the upper ~35% of the
      // viewport — the standard scrollspy trigger zone.
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Profile sections"
      // PR-080 Task 4 — `mb-3` gives the Overview zone below it real
      // breathing room from this sticky bar (the uniform `gap-6` the page's
      // other zone-to-zone transitions use reads fine there, but felt like a
      // collision directly under this bar's own border/backdrop-blur
      // weight). Scoped to this one gap only — every other zone spacing in
      // `page.tsx` is unaffected.
      className="sticky top-16 z-20 mb-3 -mx-1 overflow-x-auto rounded-xl border border-radar-light-border bg-radar-light-card/80 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-radar-bg/60"
    >
      <ul className="flex min-w-max gap-1.5">
        {SECTIONS.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => handleClick(event, section.id)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                  isActive
                    ? "bg-radar-primary/10 font-semibold text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
                    : "text-radar-light-muted hover:bg-radar-light-surface hover:text-radar-light-text dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white"
                )}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
