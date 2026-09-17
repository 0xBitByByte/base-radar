import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReportCard } from "@/components/reports/ReportCard";
import type { ExecutiveReport } from "@/lib/executive-reports/types";

function makeReport(overrides: Partial<ExecutiveReport> = {}): ExecutiveReport {
  return { id: "daily-brief", title: "Daily Brief", subtitle: "sub", status: "ready", generatedAt: "2026-09-08T00:00:00.000Z", executiveSummary: "Real summary.", sections: [], averageConfidence: null, limitations: [], ...overrides };
}

describe("ReportCard", () => {
  it("links to the real report detail route", () => {
    render(<ReportCard report={makeReport()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/reports/daily-brief");
  });

  it("shows the real populated-section count and generated timestamp", () => {
    const report = makeReport({ sections: [{ id: "s1", title: "S1", description: "", claims: [{ id: "c1" } as never], collectionMatches: [], metrics: [], emptyReason: "" }] });
    render(<ReportCard report={report} />);
    expect(screen.getByText("1 populated section")).toBeInTheDocument();
    expect(screen.getByText(/Generated/)).toBeInTheDocument();
  });

  it("'checking': an honest in-progress label, never a fabricated count", () => {
    render(<ReportCard report={makeReport({ status: "checking" })} />);
    expect(screen.getByText("Checking…")).toBeInTheDocument();
  });

  it("'unavailable': an honest error label", () => {
    render(<ReportCard report={makeReport({ status: "unavailable" })} />);
    expect(screen.getByText("Can't generate right now")).toBeInTheDocument();
  });
});
