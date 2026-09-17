import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FolderKanban, Clock } from "lucide-react";

import { CommandItem } from "@/components/command/CommandItem";
import type { SearchableItem } from "@/lib/search/types";
import { liveProject } from "../../lib/projects/fixtures";

/**
 * Universal Project Card, PR-8 — `CommandItem` stays the sole owner of
 * interaction (role="option", onSelect, keyboard) for every result type;
 * `SearchProjectRow` only ever renders as pure presentation for a
 * `type === "project"` result with a real `LiveProject` match. Confirms
 * that boundary precisely: only project+match gets the new row, every
 * other combination (including project+no-match) renders the original,
 * byte-for-byte-unchanged generic content.
 */
describe("CommandItem", () => {
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

  const timelineItem: SearchableItem = {
    id: "timeline:evt-1",
    title: "Aave shipped a release",
    description: "v3.1.0",
    group: "Timeline",
    type: "timeline",
    icon: Clock,
    route: "/dashboard/timeline",
    keywords: [],
    metadata: {},
    source: "Intelligence Timeline",
  };

  it("renders SearchProjectRow for a project result with a LiveProject match", () => {
    const aave = liveProject({
      id: "aave",
      slug: "aave",
      identity: { name: "Aave", shortDescription: "", description: "", logoUrl: null, logoUrlFallbacks: [], websiteUrl: null, socials: { twitter: null, discord: null, telegram: null, farcaster: null, docs: null, blog: null, forum: null, medium: null, mirror: null, linkedin: null } },
      aiRating: "A+",
    });
    const liveProjectById = new Map([["aave", aave]]);

    render(<CommandItem item={projectItem} active={false} onSelect={vi.fn()} onHover={vi.fn()} liveProjectById={liveProjectById} />);

    expect(screen.getByText("A+")).toBeInTheDocument();
    // The generic row's own description text should not also be present.
    expect(screen.queryByText("Lending protocol")).not.toBeInTheDocument();
  });

  it("falls back to the generic row for a project result with no LiveProject match (never fabricated)", () => {
    render(<CommandItem item={projectItem} active={false} onSelect={vi.fn()} onHover={vi.fn()} liveProjectById={new Map()} />);

    expect(screen.getByText("Aave")).toBeInTheDocument();
    expect(screen.getByText("Lending protocol")).toBeInTheDocument();
  });

  it("falls back to the generic row when liveProjectById is omitted entirely", () => {
    render(<CommandItem item={projectItem} active={false} onSelect={vi.fn()} onHover={vi.fn()} />);

    expect(screen.getByText("Lending protocol")).toBeInTheDocument();
  });

  it("leaves every non-project result type byte-for-byte unchanged, even when liveProjectById has entries", () => {
    const aave = liveProject({ id: "aave", slug: "aave" });
    const liveProjectById = new Map([["aave", aave]]);

    render(<CommandItem item={timelineItem} active={false} onSelect={vi.fn()} onHover={vi.fn()} liveProjectById={liveProjectById} />);

    expect(screen.getByText("Aave shipped a release")).toBeInTheDocument();
    expect(screen.getByText("v3.1.0")).toBeInTheDocument();
  });

  it("still calls onSelect through the same button click for a project result rendering SearchProjectRow", () => {
    const aave = liveProject({ id: "aave", slug: "aave" });
    const onSelect = vi.fn();

    render(<CommandItem item={projectItem} active={false} onSelect={onSelect} onHover={vi.fn()} liveProjectById={new Map([["aave", aave]])} />);

    screen.getByRole("option").click();
    expect(onSelect).toHaveBeenCalledWith(projectItem);
  });
});
