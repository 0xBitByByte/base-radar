import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ isWatching: () => false, toggle: vi.fn() }) }));

import { ProfileQuickActions } from "@/components/explorer/ProfileQuickActions";
import { clearCompare } from "@/lib/compare/storage";

const STORAGE_KEY = "base-radar:compare";

describe("ProfileQuickActions — PR-091 Compare entry point", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });

  it("Compare is a real, enabled toggle button, not one of the still-disabled placeholders", () => {
    render(<ProfileQuickActions projectId="aave" projectName="Aave" />);
    const compareButton = screen.getByRole("button", { name: "Add Aave to Compare" });
    expect(compareButton).not.toBeDisabled();
  });

  it("Alert and Share remain disabled 'coming soon' placeholders — unaffected by PR-091", () => {
    render(<ProfileQuickActions projectId="aave" projectName="Aave" />);
    expect(screen.getByRole("button", { name: "Alert" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });
});
