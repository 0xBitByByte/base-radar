import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProfileAIIntelligenceLinks } from "@/components/explorer/ProfileAIIntelligenceLinks";

describe("ProfileAIIntelligenceLinks", () => {
  it("links to AI Ask (via AI Workspace) and AI Executive Reports", () => {
    render(<ProfileAIIntelligenceLinks smartCollections={[]} />);
    expect(screen.getByRole("link", { name: /Ask AI Ask about the ecosystem/ })).toHaveAttribute("href", "/dashboard/ai-workspace");
    expect(screen.getByRole("link", { name: /View AI Executive Reports/ })).toHaveAttribute("href", "/dashboard/reports");
  });

  it("preserves the exact required AI Watch wording", () => {
    render(<ProfileAIIntelligenceLinks smartCollections={[]} />);
    expect(screen.getByRole("link", { name: "AI Watch" })).toBeInTheDocument();
    expect(screen.getByText(/it checks your saved watch when you open AI Workspace, it doesn't run in the background\./)).toBeInTheDocument();
  });

  it("renders no Smart Collection membership when this project matches none — never a fabricated badge", () => {
    render(<ProfileAIIntelligenceLinks smartCollections={[]} />);
    expect(screen.queryByText("Member of:")).not.toBeInTheDocument();
  });

  it("renders real Smart Collection membership badges linking to their real detail pages", () => {
    render(<ProfileAIIntelligenceLinks smartCollections={[{ id: "high-conviction", name: "High Conviction" }]} />);
    expect(screen.getByText("Member of:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "High Conviction" })).toHaveAttribute("href", "/dashboard/collections/high-conviction");
  });
});
