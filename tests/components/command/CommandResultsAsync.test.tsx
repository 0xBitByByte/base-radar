import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { FolderKanban } from "lucide-react";

import { CommandResultsAsync } from "@/components/command/CommandResultsAsync";
import type { SearchableItem } from "@/lib/search/types";
import { liveProject } from "../../lib/projects/fixtures";

/**
 * Universal Project Card, PR-8 — `CommandResultsAsync` mirrors
 * `LiveStatusBarAsync`'s `use(promise)` pattern: unwraps the already-started
 * `liveProjectsPromise` from `app/dashboard/layout.tsx` and builds the
 * lookup `CommandResults`/`CommandItem` need, without fetching anything
 * itself.
 */
describe("CommandResultsAsync", () => {
  it("resolves the promise and renders the enriched row for a matching project result", async () => {
    const aave = liveProject({
      id: "aave",
      slug: "aave",
      identity: { name: "Aave", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      aiRating: "A+",
    });
    const liveProjectsPromise = Promise.resolve([aave]);

    const projectItem: SearchableItem = {
      id: "project:aave",
      title: "Aave",
      description: "Lending protocol",
      group: "Projects",
      type: "project",
      icon: FolderKanban,
      route: "/dashboard/projects/aave",
      keywords: [],
      metadata: { status: "live" },
      source: "Project Registry",
    };

    await act(async () => {
      render(
        <Suspense fallback="loading">
          <CommandResultsAsync
            liveProjectsPromise={liveProjectsPromise}
            results={[projectItem]}
            activeItemId={null}
            onSelect={vi.fn()}
            onHover={vi.fn()}
          />
        </Suspense>
      );
      await liveProjectsPromise;
    });

    await waitFor(() => expect(screen.getByText("A+")).toBeInTheDocument());
  });
});
