import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";

describe("ProjectStatusBadge", () => {
  it("prefers the registry status when present, ignoring discoveryStatus", () => {
    render(<ProjectStatusBadge status="beta" discoveryStatus="needs-review" />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Needs Review")).not.toBeInTheDocument();
  });

  it("renders every non-default ProjectStatus value with a distinct label", () => {
    const cases: [Parameters<typeof ProjectStatusBadge>[0]["status"], string][] = [
      ["beta", "Beta"],
      ["development", "In Development"],
      ["deprecated", "Deprecated"],
      ["sunset", "Delisted"],
    ];
    for (const [status, label] of cases) {
      const { unmount } = render(<ProjectStatusBadge status={status} discoveryStatus={null} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  // Product Semantics audit — `"live"` is the default state for every
  // registry project (20/20, confirmed by direct inspection). A badge with
  // no exceptions conveys no information, so it renders nothing now,
  // exactly like the "neither field populated" case below — reserved only
  // for a project genuinely in a non-default lifecycle state.
  it("renders nothing for the default 'live' status, never padding the row with a non-informative badge", () => {
    const { container } = render(<ProjectStatusBadge status="live" discoveryStatus={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("falls back to discoveryStatus for a discovery-only project (status: null)", () => {
    render(<ProjectStatusBadge status={null} discoveryStatus="needs-review" />);
    expect(screen.getByText("Needs Review")).toBeInTheDocument();
  });

  it("collapses new and discovered into the same Newly Discovered label", () => {
    const { unmount } = render(<ProjectStatusBadge status={null} discoveryStatus="new" />);
    expect(screen.getByText("Newly Discovered")).toBeInTheDocument();
    unmount();
    render(<ProjectStatusBadge status={null} discoveryStatus="discovered" />);
    expect(screen.getByText("Newly Discovered")).toBeInTheDocument();
  });

  it("renders nothing when neither field is populated, never a fabricated default", () => {
    const { container } = render(<ProjectStatusBadge status={null} discoveryStatus={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
