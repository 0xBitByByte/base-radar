import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WatchlistsWorkspace } from "@/components/watchlists/WatchlistsWorkspace";
import { addProjectToWatchlist, createWatchlist, deleteWatchlist, getPersonalizationState } from "@/lib/personalization/storage";
import { liveProject } from "../../lib/projects/fixtures";

/**
 * Universal Project Card, PR-4 — Watchlists' rows swap from raw-registry
 * plain text to `LiveProjectCard micro`, sourced from the `liveProjects`
 * prop `app/dashboard/watchlists/page.tsx` now fetches server-side and
 * passes down. Confirms the new rendering, the honest fallback for any id
 * with no `LiveProject` match (never a fabricated card), and that
 * remove-from-watchlist (the one piece of real CRUD this component owns
 * directly) still works.
 *
 * `lib/personalization/storage.ts` caches its state in a module-level
 * variable read once at import time, so tests build watchlist state through
 * its own real mutation functions (`createWatchlist`/`addProjectToWatchlist`)
 * rather than pre-seeding `localStorage`, which the cache would never see.
 */
describe("WatchlistsWorkspace", () => {
  beforeEach(() => {
    for (const watchlist of getPersonalizationState().watchlists) {
      deleteWatchlist(watchlist.id);
    }
  });

  function seedWatchlist(projectIds: string[]) {
    const id = createWatchlist({ name: "Test Watchlist", description: "", icon: "star", color: "primary" });
    for (const projectId of projectIds) addProjectToWatchlist(id, projectId);
  }

  it("renders a watched project's row as a LiveProjectCard micro card when a LiveProject match exists", () => {
    seedWatchlist(["aave-fixture"]);
    const aave = liveProject({
      id: "aave-fixture",
      slug: "aave-fixture",
      identity: { name: "Aave Fixture", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      aiRating: "A+",
      market: { available: true, priceUsd: null, changePct24h: null, changePct7d: null, changePct30d: null, marketCapUsd: null, fdvUsd: null, volume24hUsd: null, liquidityUsd: null, tvlUsd: 5_000_000_000},
    });

    render(<WatchlistsWorkspace liveProjects={[aave]} />);

    expect(screen.getByText("Aave Fixture")).toBeInTheDocument();
    expect(screen.getByText("A+")).toBeInTheDocument();
    expect(screen.getByText("$5B")).toBeInTheDocument();
  });

  it("falls back to the honest raw-id row for a watched project id with no LiveProject match, never fabricating a card", () => {
    seedWatchlist(["totally-unknown-id-xyz"]);

    render(<WatchlistsWorkspace liveProjects={[]} />);

    expect(screen.getByText("totally-unknown-id-xyz")).toBeInTheDocument();
  });

  it("still removes a project from the watchlist via the remove button (CRUD unaffected by the rendering change)", async () => {
    seedWatchlist(["aave-fixture"]);
    const aave = liveProject({ id: "aave-fixture", slug: "aave-fixture", identity: { name: "Aave Fixture", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } } });

    render(<WatchlistsWorkspace liveProjects={[aave]} />);
    expect(screen.getByText("Aave Fixture")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Remove Aave Fixture from Test Watchlist/ }));

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });
});
