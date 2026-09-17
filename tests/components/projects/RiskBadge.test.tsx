import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RiskBadge } from "@/components/projects/RiskBadge";

describe("RiskBadge", () => {
  it("renders Low Risk, High Risk, and Risk Unrated distinctly", () => {
    const { unmount: unmountLow } = render(<RiskBadge riskLevel="low" />);
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
    unmountLow();

    const { unmount: unmountHigh } = render(<RiskBadge riskLevel="high" />);
    expect(screen.getByText("High Risk")).toBeInTheDocument();
    unmountHigh();

    render(<RiskBadge riskLevel={null} />);
    expect(screen.getByText("Risk Unrated")).toBeInTheDocument();
  });

  it("folds elevated into the same Moderate Risk label as moderate (EN-1 resolution)", () => {
    const { unmount } = render(<RiskBadge riskLevel="moderate" />);
    expect(screen.getByText("Moderate Risk")).toBeInTheDocument();
    unmount();

    render(<RiskBadge riskLevel="elevated" />);
    expect(screen.getByText("Moderate Risk")).toBeInTheDocument();
  });

  it("V1-FIX-022 — the tooltip trigger opts into pointer-events-auto so it stays reachable under a pointer-events-none ancestor (e.g. LiveProjectCard's content wrapper)", () => {
    const contributors = [{ label: "Liquidity Risk", detail: "Only $50.00K in tracked DEX liquidity.", severity: "high" as const }];
    const { container } = render(<RiskBadge riskLevel="high" contributors={contributors} />);
    const trigger = container.querySelector("[data-base-ui-tooltip-trigger]");
    expect(trigger).not.toBeNull();
    expect(trigger!.className).toContain("pointer-events-auto");
  });
});
