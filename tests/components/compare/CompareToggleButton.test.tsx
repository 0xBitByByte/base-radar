import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { addToCompare, clearCompare } from "@/lib/compare/storage";
import { MAX_COMPARE_PROJECTS } from "@/lib/compare/types";

const STORAGE_KEY = "base-radar:compare";

describe("CompareToggleButton", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });

  it("starts as 'Compare' (not comparing)", () => {
    render(<CompareToggleButton projectId="aave" projectName="Aave" />);
    const button = screen.getByRole("button", { name: "Add Aave to Compare" });
    expect(button).toHaveTextContent("Compare");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking adds the project and switches to 'Comparing'", async () => {
    const user = userEvent.setup();
    render(<CompareToggleButton projectId="aave" projectName="Aave" />);
    await user.click(screen.getByRole("button", { name: "Add Aave to Compare" }));
    const button = screen.getByRole("button", { name: "Remove Aave from Compare" });
    expect(button).toHaveTextContent("Comparing");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking again removes the project", async () => {
    const user = userEvent.setup();
    render(<CompareToggleButton projectId="aave" projectName="Aave" />);
    await user.click(screen.getByRole("button", { name: "Add Aave to Compare" }));
    await user.click(screen.getByRole("button", { name: "Remove Aave from Compare" }));
    expect(screen.getByRole("button", { name: "Add Aave to Compare" })).toBeInTheDocument();
  });

  it("disables adding a new project once the list is full, with an honest reason in its title", () => {
    for (let i = 0; i < MAX_COMPARE_PROJECTS; i++) addToCompare(`project-${i}`);
    render(<CompareToggleButton projectId="not-yet-added" projectName="Not Yet Added" />);
    const button = screen.getByRole("button", { name: "Add Not Yet Added to Compare" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringContaining(`${MAX_COMPARE_PROJECTS}/${MAX_COMPARE_PROJECTS}`));
  });

  it("never disables removing a project that IS already in a full list", () => {
    for (let i = 0; i < MAX_COMPARE_PROJECTS; i++) addToCompare(`project-${i}`);
    render(<CompareToggleButton projectId="project-0" projectName="Project 0" />);
    const button = screen.getByRole("button", { name: "Remove Project 0 from Compare" });
    expect(button).not.toBeDisabled();
  });
});
