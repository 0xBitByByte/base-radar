import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AIIntelligenceHubStrip } from "@/components/dashboard/AIIntelligenceHubStrip";

describe("AIIntelligenceHubStrip", () => {
  it("links to AI Workspace, Smart Collections, and AI Reports — the three surfaces the Dashboard otherwise never links to", () => {
    render(<AIIntelligenceHubStrip />);
    expect(screen.getByRole("link", { name: /AI Workspace/ })).toHaveAttribute("href", "/dashboard/ai-workspace");
    expect(screen.getByRole("link", { name: /Smart Collections/ })).toHaveAttribute("href", "/dashboard/collections");
    expect(screen.getByRole("link", { name: /AI Reports/ })).toHaveAttribute("href", "/dashboard/reports");
  });

  it("renders exactly 3 links — a slim strip, never a wall of cards", () => {
    render(<AIIntelligenceHubStrip />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
