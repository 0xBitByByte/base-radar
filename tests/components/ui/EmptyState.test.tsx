import { Star } from "lucide-react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title, description, and action", () => {
    render(
      <EmptyState
        icon={Star}
        title="Nothing here yet"
        description="Add something to see it in this list."
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Add something to see it in this list.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("renders without a description when none is given", () => {
    render(<EmptyState icon={Star} title="Nothing here yet" />);

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("hides the decorative icon from assistive technology", () => {
    const { container } = render(<EmptyState icon={Star} title="Nothing here yet" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
