import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PortfolioMonitoringSection } from "@/components/wallet/PortfolioMonitoringSection";
import type { UsePortfolioMonitoringResult } from "@/lib/hooks/usePortfolioMonitoring";
import type { PortfolioMonitoringAlert } from "@/lib/portfolio-monitoring/types";

function makeMonitoring(overrides: Partial<UsePortfolioMonitoringResult> = {}): UsePortfolioMonitoringResult {
  return {
    status: "ready",
    enabled: true,
    exists: true,
    heldProjectCount: 1,
    alerts: [],
    unreadCount: 0,
    enable: vi.fn(),
    disable: vi.fn(),
    remove: vi.fn(),
    markRead: vi.fn(),
    markUnread: vi.fn(),
    ...overrides,
  };
}

function makeAlert(overrides: Partial<PortfolioMonitoringAlert> = {}): PortfolioMonitoringAlert {
  return { id: "portfolio-watch:whale:1", kind: "whale", firstSeenAt: "2026-01-01T00:00:00.000Z", isRead: false, readAt: null, projectId: "aave", projectName: "Aave", projectSlug: "aave", headline: "Large AAVE transfer detected for Aave", detail: "A real $500,000 transfer was detected for Aave.", ...overrides };
}

describe("PortfolioMonitoringSection", () => {
  it("preserves the exact required 'checks when you open, not the background' wording", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring()} />);
    expect(screen.getByText(/Portfolio Monitoring checks when you open this page — it doesn't run in the background\./)).toBeInTheDocument();
  });

  it("disabled: shows an honest 'no monitoring yet' state with a real enable action", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ enabled: false, exists: false })} />);
    expect(screen.getByText("No monitoring yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on Portfolio Monitoring" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("'checking': a real loading region, no fabricated content", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ status: "checking" })} />);
    expect(screen.getByRole("status", { name: "Checking Portfolio Monitoring" })).toBeInTheDocument();
  });

  it("'unavailable': an honest 'can't check right now' message — the hard stale-data gate", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ status: "unavailable" })} />);
    expect(screen.getByText("Can't check right now")).toBeInTheDocument();
  });

  it("'ready' with zero held projects: an honest 'nothing to monitor' state", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ heldProjectCount: 0 })} />);
    expect(screen.getByText("No tracked projects held")).toBeInTheDocument();
  });

  it("'ready' with held projects but no alerts yet: an honest 'nothing new' state", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ heldProjectCount: 1, alerts: [] })} />);
    expect(screen.getByText("Nothing new yet")).toBeInTheDocument();
  });

  it("renders a real whale alert with its real headline, detail, and project link", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ alerts: [makeAlert()], unreadCount: 1 })} />);
    expect(screen.getByText("Large AAVE transfer detected for Aave")).toBeInTheDocument();
    expect(screen.getByText(/500,000 transfer/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Aave/ })).toHaveAttribute("href", "/dashboard/projects/aave");
  });

  it("renders a real governance alert distinctly from a whale alert", () => {
    render(<PortfolioMonitoringSection monitoring={makeMonitoring({ alerts: [makeAlert({ id: "portfolio-watch:governance:aave:3", kind: "governance", headline: "New governance proposal for Aave" })], unreadCount: 1 })} />);
    expect(screen.getByText("Governance Activity")).toBeInTheDocument();
    expect(screen.getByText("New governance proposal for Aave")).toBeInTheDocument();
  });

  it("never nests a <li> directly inside another <li> — the previously-discovered hydration bug class", () => {
    const { container } = render(<PortfolioMonitoringSection monitoring={makeMonitoring({ alerts: [makeAlert()] })} />);
    const violations = Array.from(container.querySelectorAll("li")).filter((li) => Array.from(li.children).some((child) => child.tagName === "LI"));
    expect(violations).toHaveLength(0);
  });
});
