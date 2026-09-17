import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WatchedProjectRow } from "@/components/dashboard/WatchedProjectRow";
import { liveProject } from "../../lib/projects/fixtures";

const IDENTITY = {
  shortDescription: "",
  description: "",
  logoUrl: null,
  logoUrlFallbacks: [],
  websiteUrl: null,
  socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null },
};

/**
 * Bug fix (visual formatting) — `WatchedProjectRow` is the dashboard-owned
 * two-line row `WatchlistWidget`/`AIProjectsWidget` both render instead of
 * `LiveProjectCard`'s `variant="micro"`: name+grade on line 1, chain+value+
 * 24h trend on line 2. These tests cover exactly the behavior that's new
 * relative to `micro` — the trend indicator's real up/down/absent cases —
 * plus the honest "Not Tracked" floor `micro` already established.
 */
describe("WatchedProjectRow", () => {
  it("renders name, grade, chain, and value", () => {
    const project = liveProject({
      id: "aave",
      slug: "aave",
      category: "lending",
      identity: { name: "Aave", ...IDENTITY },
      aiRating: "A+",
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 15_000_000_000 },
    });
    render(<WatchedProjectRow project={project} />);

    expect(screen.getByRole("link", { name: "Aave" })).toBeInTheDocument();
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("$15B")).toBeInTheDocument();
  });

  it("shows a green upward indicator for a real positive 24h change", () => {
    const project = liveProject({
      id: "uniswap",
      slug: "uniswap",
      category: "dex",
      identity: { name: "Uniswap", ...IDENTITY },
      market: { available: true, priceUsd: null, changePct24h: 5.9, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 50_000, liquidityUsd: null, tvlUsd: null },
    });
    const { container } = render(<WatchedProjectRow project={project} />);

    expect(screen.getByText("5.9%")).toBeInTheDocument();
    const indicator = screen.getByText("5.9%").closest("span");
    expect(indicator?.className).toContain("text-radar-success");
    expect(container.querySelector("svg.lucide-trending-up")).not.toBeNull();
  });

  it("shows a red downward indicator for a real negative 24h change", () => {
    const project = liveProject({
      id: "aerodrome",
      slug: "aerodrome",
      category: "dex",
      identity: { name: "Aerodrome Finance", ...IDENTITY },
      market: { available: true, priceUsd: null, changePct24h: -5.2, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: 2_730_000, liquidityUsd: null, tvlUsd: null },
    });
    const { container } = render(<WatchedProjectRow project={project} />);

    expect(screen.getByText("-5.2%")).toBeInTheDocument();
    const indicator = screen.getByText("-5.2%").closest("span");
    expect(indicator?.className).toContain("text-radar-danger");
    expect(container.querySelector("svg.lucide-trending-down")).not.toBeNull();
  });

  it("renders no trend indicator at all when 24h change is genuinely unknown — never a fabricated 0%", () => {
    const project = liveProject({
      id: "clanker",
      slug: "clanker",
      category: "infrastructure",
      identity: { name: "Clanker", ...IDENTITY },
      aiRating: "D",
      market: { available: false, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: null },
    });
    const { container } = render(<WatchedProjectRow project={project} />);

    expect(screen.getByText("Not Tracked")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-trending-up")).toBeNull();
    expect(container.querySelector("svg.lucide-trending-down")).toBeNull();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("renders without a navigation link for a discovery-only project (no slug)", () => {
    const project = liveProject({
      source: "discovery",
      slug: null,
      aiRating: null,
      identity: { name: "Brand New Coin", ...IDENTITY },
    });
    const { container } = render(<WatchedProjectRow project={project} />);

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Brand New Coin")).toBeInTheDocument();
  });
});
