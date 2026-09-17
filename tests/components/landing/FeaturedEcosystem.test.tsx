import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// framer-motion's `whileInView` needs IntersectionObserver, absent under jsdom by default (same pattern as ProductProof.test.tsx).
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

import { FeaturedEcosystem } from "@/components/landing/FeaturedEcosystem";
import { FEATURED_PROJECTS } from "@/components/landing/featuredProjects";

/**
 * PR-098.05 — Landing Page Intelligence Delivery Architecture. Confirms
 * `FeaturedEcosystem` defaults to the illustrative `FEATURED_PROJECTS`
 * (unchanged behavior for any caller that doesn't pass `projects`) but
 * renders whatever server-merged list `app/page.tsx` passes in when it
 * does — the actual live-data wiring itself is covered by
 * `featuredProjects.test.ts`'s `buildFeaturedProjectsWithSnapshot` tests.
 */
describe("FeaturedEcosystem — projects prop (PR-098.05)", () => {
  it("defaults to the illustrative FEATURED_PROJECTS count when no projects prop is passed", () => {
    render(<FeaturedEcosystem />);
    expect(screen.getByText(`${FEATURED_PROJECTS.length} protocols Base Radar tracks — real verification, health, and confidence scoring, updated continuously.`)).toBeInTheDocument();
  });

  it("renders a caller-provided projects list instead (e.g. the server-merged live+illustrative array)", () => {
    const singleProject = [FEATURED_PROJECTS[0]];
    render(<FeaturedEcosystem projects={singleProject} />);
    expect(screen.getByText(`1 protocols Base Radar tracks — real verification, health, and confidence scoring, updated continuously.`)).toBeInTheDocument();
    expect(screen.getAllByText(singleProject[0].identity.name).length).toBeGreaterThan(0);
  });
});
