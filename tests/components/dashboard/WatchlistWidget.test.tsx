import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { WatchlistWidget } from "@/components/dashboard/WatchlistWidget";
import { createWatchlist, deleteWatchlist, getPersonalizationState, toggleMembershipProject } from "@/lib/personalization/storage";
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
 * Universal Project Card, PR-6 — `WatchlistWidget` retired
 * `ProjectIntelligence[]` for the canonical `LiveProject` model, filtered
 * by the real membership-watchlist storage (via `useWatchlist()`) rather
 * than the `ProjectIntelligence`-typed `useWatchedProjects`. Tests build
 * watched state through the storage module's own real mutation function
 * (`toggleMembershipProject`), same technique as PR-4's
 * `WatchlistsWorkspace` tests, since its cache is a module-level singleton
 * read once at import time.
 */
describe("WatchlistWidget", () => {
  beforeEach(() => {
    // `getMembershipProjectIds()` (the real app's active-watchlist read)
    // assumes at least one watchlist always exists, matching production
    // (`buildDefaultState()` always seeds one) — reset to exactly one
    // empty watchlist rather than genuinely zero, which the real app
    // never produces either.
    for (const watchlist of getPersonalizationState().watchlists) {
      deleteWatchlist(watchlist.id);
    }
    createWatchlist({ name: "Favorites", description: "", icon: "star", color: "primary" });
  });

  it("shows only watched projects, rendered via LiveProjectCard micro", () => {
    toggleMembershipProject("watched-1");
    const watchedProject = liveProject({
      id: "watched-1",
      slug: "watched-1",
      identity: { name: "Watched Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      aiRating: "B+",
    });
    const unwatchedProject = liveProject({
      id: "unwatched-1",
      identity: { name: "Unwatched Project", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
    });

    render(<WatchlistWidget liveProjects={[watchedProject, unwatchedProject]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Watched Project")).toBeInTheDocument();
    expect(screen.getByText("B+")).toBeInTheDocument();
    expect(screen.queryByText("Unwatched Project")).not.toBeInTheDocument();
  });

  it("renders the honest empty state when nothing is watched", () => {
    render(<WatchlistWidget liveProjects={[liveProject()]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    expect(screen.getByText("Nothing watched yet.")).toBeInTheDocument();
  });

  it("still renders the 'View full watchlist' link", () => {
    render(<WatchlistWidget liveProjects={[]} lastUpdated="2026-01-01T00:00:00.000Z" />);

    const link = screen.getByRole("link", { name: /View full watchlist/ });
    expect(link).toHaveAttribute("href", "/dashboard/watchlists");
  });
});
