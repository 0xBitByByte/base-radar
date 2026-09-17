"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  BarChart3,
  BrainCircuit,
  Database,
  DollarSign,
  FileCode2,
  HeartPulse,
  History,
  LayoutDashboard,
  Network,
  Sparkles,
  Star,
  Vote,
} from "lucide-react";

import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { FloatingSectionNav, type FloatingNavSection } from "@/components/navigation/FloatingSectionNav";

/**
 * PR-073 refinement pass — reordered to match the page's new investor-first
 * reading order (verdict -> market/on-chain data -> evidence & history), and
 * "Trust" (`trust-center`) and "Timeline" (`ProfileActivityFeed`, previously
 * missing its own anchor) added so every real section a reader lands on has
 * a working nav entry.
 *
 * PR-085.01 — "Trust" (`trust-center`) removed: `ProfileTrustCenter` itself
 * was retired (see `ProfileExecutiveIntelligence.tsx`'s doc comment) as part
 * of consolidating this page's four fragmented "can I trust it?" sections
 * down to one. "Health & Trust" (`overview`) is now this page's one trust
 * section with a working anchor.
 */
// PR-079 Phase 6 — order now matches the page's actual zone order (Overview
// -> Intelligence -> Market -> Trust -> Governance -> Activity -> Sources)
// so the nav's left-to-right link order lines up with top-to-bottom scroll
// position. `tvl` removed (absorbed into the `price` card's Overview metric
// cards, Section 3); `community`/`developer` merged into one `intelligence`
// id (Section 4's "Project Intelligence").
// PR-084.01 — `price` moved after `intelligence` (was first) and `trading`
// added, matching page.tsx's relocated Overview zone now sitting between
// Intelligence and Market/Contracts: Price naturally leads into Trading,
// per this same PR's reorder of the actual page content.
const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "overview", label: "Health & Trust" },
  { id: "why-it-matters", label: "Why It Matters" },
  { id: "intelligence", label: "Intelligence" },
  { id: "price", label: "Price" },
  { id: "trading", label: "Trading" },
  { id: "contracts", label: "Contracts" },
  { id: "network", label: "Network" },
  { id: "governance", label: "Governance" },
  { id: "recent-highlights", label: "Highlights" },
  { id: "timeline", label: "Timeline" },
  { id: "sources", label: "Sources" },
] as const;

/**
 * PR-087 — the same 13 section ids/labels above, annotated with an icon for
 * `FloatingSectionNav`'s bottom-right jump panel (this file's own sticky top
 * bar has never needed icons, so `SECTIONS` itself stays icon-less). One
 * array, two consumers — never a second, independently-maintained section
 * list that could drift from this page's real anchor ids.
 *
 * Kept module-private (not exported): `page.tsx` mounts this file's default
 * export only, never this array directly. A Server Component can render a
 * Client Component with no props, but it can't pass a plain-data prop
 * containing live icon component references across that boundary — React
 * only allows a Client Component's own references to cross serialization
 * as JSX elements, not as arbitrary data fields (confirmed live: passing
 * this array as a prop from `page.tsx` threw "Functions cannot be passed
 * directly to Client Components"). Rendering `FloatingSectionNav` from
 * inside this already-`"use client"` file avoids that boundary entirely.
 */
const PROFILE_NAV_SECTIONS: readonly FloatingNavSection[] = [
  { id: "summary", label: "Summary", icon: LayoutDashboard },
  { id: "overview", label: "Health & Trust", icon: HeartPulse },
  { id: "why-it-matters", label: "Why It Matters", icon: Sparkles },
  { id: "intelligence", label: "Intelligence", icon: BrainCircuit },
  { id: "price", label: "Price", icon: DollarSign },
  { id: "trading", label: "Trading", icon: BarChart3 },
  { id: "contracts", label: "Contracts", icon: FileCode2 },
  { id: "network", label: "Network", icon: Network },
  { id: "governance", label: "Governance", icon: Vote },
  { id: "recent-highlights", label: "Highlights", icon: Star },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "sources", label: "Sources", icon: Database },
];

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
 *
 * PR-086 — a sliding indicator (`indicatorStyle`, measured off the active
 * `<a>`'s own `offsetLeft`/`offsetWidth` via `linkRefs`) animates between
 * sections instead of the highlight just snapping between them — the same
 * real `activeId` this nav already tracked via `IntersectionObserver`
 * (unchanged), just given a second, animated visual on top of the existing
 * static background treatment (kept, not replaced — the indicator is a
 * reinforcing accent, not the only signal). Snap points (`snap-x`/
 * `snap-start`) added to the existing horizontal-scroll container — real
 * behavior improvement, not a new scroll mechanism. Background bumped one
 * step more transparent (`/80` -> `/70`) for a more genuine glass read.
 */
export function ProfileSectionNav() {
  const prefersReducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const listRef = useRef<HTMLUListElement>(null);

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

  // PR-086 — measures the active link's real position within the scroll
  // container on every `activeId` change and on resize, so the sliding
  // indicator always matches the actual rendered link (never a guessed
  // width) at any viewport size.
  useEffect(() => {
    function measure() {
      const link = linkRefs.current[activeId];
      if (!link) return;
      setIndicatorStyle({ left: link.offsetLeft, width: link.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <nav
        aria-label="Profile sections"
        // PR-080 Task 4 — `mb-3` gives the Overview zone below it real
        // breathing room from this sticky bar (the uniform `gap-6` the page's
        // other zone-to-zone transitions use reads fine there, but felt like a
        // collision directly under this bar's own border/backdrop-blur
        // weight). Scoped to this one gap only — every other zone spacing in
        // `page.tsx` is unaffected.
        className="sticky top-16 z-20 mb-3 -mx-1 overflow-x-auto rounded-xl border border-radar-primary/[0.18] bg-radar-light-card/40 px-3 py-2 shadow-[0_8px_24px_-16px_rgba(16,34,58,0.3),inset_0_1px_0_0_rgba(255,255,255,0.6)] backdrop-blur-2xl dark:border-white/10 dark:bg-radar-bg/40 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      >
        <ul ref={listRef} className="relative flex min-w-max snap-x gap-1.5">
          {/* PR-086 — the sliding indicator: absolutely positioned, animates
              `left`/`width` via `transition-all`, sits behind the link text
              (`z-0`, links are `z-10`) as a soft accent bar. `null` until the
              first measurement lands (`indicatorStyle`), so it never flashes
              at a wrong position before mount. */}
          {indicatorStyle && (
            <li
              aria-hidden="true"
              className="absolute top-0 z-0 h-full rounded-lg bg-radar-primary/10 transition-[left,width] duration-300 ease-out motion-reduce:transition-none dark:bg-radar-primary/15"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
          )}
          {SECTIONS.map((section) => {
            const isActive = section.id === activeId;
            return (
              <li key={section.id} className="relative z-10 snap-start">
                <a
                  ref={(el) => {
                    linkRefs.current[section.id] = el;
                  }}
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => handleClick(event, section.id)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-150",
                    "focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                    isActive
                      ? "font-semibold text-radar-primary dark:text-radar-accent"
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
      {/* PR-087 — the same reusable bottom-right widget the Projects
          directory uses, pointed at this page's own 13 sections. Mounted
          here (inside this already-`"use client"` component) rather than
          from `page.tsx` directly — see `PROFILE_NAV_SECTIONS`'s own doc
          comment for why passing it as a prop from the Server Component
          page fails at runtime. */}
      <FloatingSectionNav sections={PROFILE_NAV_SECTIONS} />
    </>
  );
}
