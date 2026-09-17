import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { HideableWidget } from "@/components/dashboard/HideableWidget";

let mockIsHidden = () => false;
vi.mock("@/lib/hooks/useDashboardLayoutPreferences", () => ({
  useDashboardLayoutPreferences: () => ({ isHidden: mockIsHidden }),
}));

describe("HideableWidget", () => {
  it("renders its real children when the widget is not hidden", () => {
    mockIsHidden = () => false;
    render(
      <HideableWidget id="trending">
        <div>Trending content</div>
      </HideableWidget>
    );
    expect(screen.getByText("Trending content")).toBeInTheDocument();
  });

  it("renders nothing when the widget is hidden — never a fake empty-state placeholder", () => {
    mockIsHidden = () => true;
    const { container } = render(
      <HideableWidget id="trending">
        <div>Trending content</div>
      </HideableWidget>
    );
    expect(screen.queryByText("Trending content")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
