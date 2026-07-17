"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "community", label: "Community" },
  { id: "price", label: "Price" },
  { id: "tvl", label: "TVL" },
  { id: "network", label: "Network" },
  { id: "developer", label: "Engineering" },
  { id: "contracts", label: "Contracts" },
  { id: "governance", label: "Governance" },
  { id: "timeline", label: "Timeline" },
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
      className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-xl border border-radar-light-border bg-radar-light-card/80 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-radar-bg/60"
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
