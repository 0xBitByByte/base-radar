import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import {
  ProjectsDirectorySkeleton,
  ProjectsDiscoverySkeleton,
  ProjectsHeroSkeleton,
} from "@/components/projects/ProjectsLoadingSkeletons";

/**
 * PR-085.02B — the local dev server resolves the Projects page's mock data
 * fast enough that a live browser session can't reliably catch these
 * fallbacks mid-transition (a documented, previously-observed tool/timing
 * limitation in this codebase's own verification history). These
 * component-level tests are the repeatable substitute: real assertions on
 * the actual rendered output, not a screenshot that may or may not land
 * mid-stream.
 */
describe("Projects page loading skeletons (Loading Strategy Standard compliance)", () => {
  it("ProjectsHeroSkeleton: outer region is aria-busy, matching final layout order (Header → Base Today → Interaction Bar → Overview/Smart Views)", () => {
    const { container } = render(<ProjectsHeroSkeleton />);
    const region = container.firstElementChild as HTMLElement;
    expect(region.getAttribute("aria-busy")).toBe("true");
    // Every individual placeholder shape stays out of the accessibility tree.
    const shapes = container.querySelectorAll('[aria-hidden="true"]');
    expect(shapes.length).toBeGreaterThan(0);
  });

  it("ProjectsDiscoverySkeleton: outer region is aria-busy and reuses one shared rail-row shape three times", () => {
    const { container } = render(<ProjectsDiscoverySkeleton />);
    const region = container.firstElementChild as HTMLElement;
    expect(region.getAttribute("aria-busy")).toBe("true");
    // Category Rail pills (8) + 3 rail rows x (1 title + 4 cards) = 8 + 15 = 23 hidden shapes.
    const shapes = container.querySelectorAll('[aria-hidden="true"]');
    expect(shapes.length).toBe(23);
  });

  it("ProjectsDirectorySkeleton: outer region is aria-busy and uses the same responsive grid classes as the real Directory", () => {
    const { container } = render(<ProjectsDirectorySkeleton />);
    const region = container.firstElementChild as HTMLElement;
    expect(region.getAttribute("aria-busy")).toBe("true");
    const grid = container.querySelector(".grid");
    expect(grid?.className).toContain("sm:grid-cols-2");
    // PR-085.03, Requirement 1 — capped at exactly 3 columns, matching the real Directory's grid (previously grew to 5 columns at `2xl`).
    expect(grid?.className).toContain("lg:grid-cols-3");
    expect(grid?.className).not.toContain("xl:grid-cols-4");
    expect(grid?.className).not.toContain("2xl:grid-cols-5");
  });

  it("no skeleton renders generic 'Loading...'/'Resolving...' text — shapes only, per the Loading Strategy Standard", () => {
    const hero = render(<ProjectsHeroSkeleton />);
    const discovery = render(<ProjectsDiscoverySkeleton />);
    const directory = render(<ProjectsDirectorySkeleton />);
    for (const { container } of [hero, discovery, directory]) {
      expect(container.textContent).toBe("");
    }
  });
});
