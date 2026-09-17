import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectSpotlight } from "@/components/dashboard/ProjectSpotlight";
import { liveProject } from "../../lib/projects/fixtures";

// WidgetCard (unchanged, shared by every dashboard widget) reads
// next/navigation's useRouter for its overflow menu, and framer-motion's
// in-view animation needs IntersectionObserver — neither exists under
// jsdom by default.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

/**
 * Universal Project Card, PR-7 — `ProjectSpotlight` retired
 * `ProjectSpotlightData` (a raw DefiLlama top-protocol read, independent of
 * the Project Registry) for the canonical `LiveProject` model: the single
 * highest-`market.tvlUsd` project, rendered via `LiveProjectCard detailed`.
 */
describe("ProjectSpotlight", () => {
  it("selects the single highest-TVL project", () => {
    const smaller = liveProject({
      id: "small-tvl",
      slug: "small-tvl",
      identity: { name: "Smaller TVL Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 1_000_000},
    });
    const larger = liveProject({
      id: "large-tvl",
      slug: "large-tvl",
      identity: { name: "Larger TVL Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 100_000_000},
    });

    render(<ProjectSpotlight liveProjects={[smaller, larger]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Larger TVL Project")).toBeInTheDocument();
    expect(screen.queryByText("Smaller TVL Project")).not.toBeInTheDocument();
  });

  it("ignores projects with no TVL data when selecting", () => {
    const noTvl = liveProject({
      id: "no-tvl",
      identity: { name: "No TVL Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
    });
    const hasTvl = liveProject({
      id: "has-tvl",
      slug: "has-tvl",
      identity: { name: "Has TVL Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 5_000_000},
    });

    render(<ProjectSpotlight liveProjects={[noTvl, hasTvl]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Has TVL Project")).toBeInTheDocument();
  });

  it("renders an honest empty state, never a fabricated project, when no project has TVL data", () => {
    const noTvl = liveProject({ market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null} });
    render(<ProjectSpotlight liveProjects={[noTvl]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("No TVL data available")).toBeInTheDocument();
  });

  it("renders the full detailed card, not micro or compact (e.g. AI Recommendation phrase, detailed-only)", () => {
    const project = liveProject({
      id: "detailed-test",
      slug: "detailed-test",
      category: "lending",
      identity: { name: "Detailed Test Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      riskLevel: "low",
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 10_000_000},
    });

    render(<ProjectSpotlight liveProjects={[project]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Suitable for Deeper Research")).toBeInTheDocument();
  });
});
