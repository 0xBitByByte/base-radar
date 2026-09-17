import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AIProjectsWidget } from "@/components/dashboard/AIProjectsWidget";
import { liveProject } from "../../lib/projects/fixtures";

// WidgetCard (unchanged, shared by every dashboard widget) reads
// next/navigation's useRouter for its overflow menu, and framer-motion's
// in-view animation needs IntersectionObserver — neither exists under
// jsdom by default, so any component under this shared wrapper needs both
// stubbed, same as this one.
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
 * Universal Project Card, PR-5 — `AIProjectsWidget` retired the legacy
 * `AIProject[]`/CoinGecko-heuristic model for the canonical `LiveProject`
 * model, filtered to `category === "ai"`. Confirms the filter, the
 * `categoryAwarePrimaryMetricValue`-descending sort (same value function
 * Category Rank already uses), the 6-item cap, and the honest empty state
 * (never a fabricated project) when no AI-category project exists.
 */
describe("AIProjectsWidget", () => {
  it("shows only category === 'ai' projects, ignoring every other category", () => {
    const aiProject = liveProject({
      id: "ai-1",
      category: "ai",
      identity: { name: "AI Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: 10_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
    });
    const dexProject = liveProject({
      id: "dex-1",
      category: "dex",
      identity: { name: "DEX Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
    });

    render(<AIProjectsWidget liveProjects={[aiProject, dexProject]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("AI Project")).toBeInTheDocument();
    expect(screen.queryByText("DEX Project")).not.toBeInTheDocument();
  });

  it("sorts AI projects by categoryAwarePrimaryMetricValue (market cap) descending", () => {
    const smaller = liveProject({
      id: "ai-small",
      category: "ai",
      identity: { name: "Smaller AI", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: 1_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
    });
    const larger = liveProject({
      id: "ai-large",
      category: "ai",
      identity: { name: "Larger AI", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: 50_000_000, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
    });

    const { container } = render(<AIProjectsWidget liveProjects={[smaller, larger]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    const names = [...container.querySelectorAll("a[aria-label]")].map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["Larger AI", "Smaller AI"]);
  });

  it("caps the list at 6 projects", () => {
    const projects = Array.from({ length: 9 }, (_, i) =>
      liveProject({
        id: `ai-${i}`,
        slug: `ai-${i}`,
        category: "ai",
        identity: { name: `AI ${i}`, shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
        market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: 1_000_000 * (i + 1), fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null},
      })
    );

    const { container } = render(<AIProjectsWidget liveProjects={projects} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(container.querySelectorAll("a[aria-label]").length).toBe(6);
  });

  it("renders an honest empty state, never a fabricated project, when no AI-category project exists", () => {
    const dexProject = liveProject({ category: "dex" });
    render(<AIProjectsWidget liveProjects={[dexProject]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("No AI projects tracked yet")).toBeInTheDocument();
  });
});
