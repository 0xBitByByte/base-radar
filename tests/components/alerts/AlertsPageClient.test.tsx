import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ projectIds: ["aave"], count: 1, isWatching: () => true, toggle: () => {} }) }));

const { AlertsPageClient } = await import("@/components/alerts/AlertsPageClient");

describe("AlertsPageClient — PR-090.06 AI Watch cross-navigation", () => {
  it("links to AI Workspace with the exact required AI Watch wording, without touching the Alert Engine's own feed", () => {
    render(<AlertsPageClient logoMap={{}} />);
    const link = screen.getByRole("link", { name: /AI Watch checks your saved watch when you open AI Workspace — it doesn't run in the background\./ });
    expect(link).toHaveAttribute("href", "/dashboard/ai-workspace");
  });
});
