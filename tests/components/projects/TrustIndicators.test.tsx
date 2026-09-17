import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TrustIndicators } from "@/components/projects/TrustIndicators";
import { liveProject } from "../../lib/projects/fixtures";

describe("TrustIndicators", () => {
  it("shows the real verification status for a registry project", () => {
    const project = liveProject({ source: "registry", verification: { status: "verified", level: null, verifiedAt: null } });
    render(<TrustIndicators project={project} isCompact={false} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows the Discovered treatment for a discovery-only project, never a fabricated verification status", () => {
    const project = liveProject({ source: "discovery", verification: { status: null, level: null, verifiedAt: null } });
    render(<TrustIndicators project={project} isCompact={false} />);
    expect(screen.getByText("Discovered")).toBeInTheDocument();
  });

  it("shows the confidence level", () => {
    const project = liveProject({ confidence: { score: 80, level: "high", source: "intelligence" } });
    render(<TrustIndicators project={project} isCompact={false} />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  /**
   * PR-085.03B, Finding 1 — the raw numeric confidence score no longer
   * renders on the discovery card at either density; only the interpreted
   * level does. The score itself stays fully available on the Project
   * Profile page (a different component, untouched by this change).
   */
  it("never renders the raw numeric confidence score at either density", () => {
    const project = liveProject({ confidence: { score: 80, level: "high", source: "intelligence" } });

    const { unmount } = render(<TrustIndicators project={project} isCompact={false} />);
    expect(screen.queryByText(/80/)).not.toBeInTheDocument();
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    unmount();

    render(<TrustIndicators project={project} isCompact />);
    expect(screen.queryByText(/80/)).not.toBeInTheDocument();
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
  });

  /**
   * PR-085.03B, Finding 2 — the freshness timestamp is removed entirely
   * from the card at both densities (near-zero information value during
   * discovery, changed on every request). `project.lastUpdated` itself is
   * untouched — this only asserts the card no longer displays it.
   */
  it("never renders the freshness timestamp at either density", () => {
    const project = liveProject({ lastUpdated: "2026-01-01T00:00:00.000Z" });

    const { unmount } = render(<TrustIndicators project={project} isCompact={false} />);
    expect(screen.queryByText(/^Updated/)).not.toBeInTheDocument();
    unmount();

    render(<TrustIndicators project={project} isCompact />);
    expect(screen.queryByText(/^Updated/)).not.toBeInTheDocument();
  });
});
