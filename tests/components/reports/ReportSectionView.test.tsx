import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReportSectionView } from "@/components/reports/ReportSectionView";
import type { ReportSection } from "@/lib/executive-reports/types";
import type { WorkspaceClaim } from "@/lib/ai-workspace/types";
import type { SmartCollectionMatch } from "@/lib/smart-collections/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "security",
    headline: "Real headline",
    summary: "Real summary.",
    confidence: { kind: "level", level: "high", rationale: "r", evidenceCount: 1 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function makeMatch(overrides: Partial<SmartCollectionMatch> = {}): SmartCollectionMatch {
  return { projectId: "a", projectName: "Real Project", projectSlug: "a", liveProject: null, reason: "Real reason.", evidence: [], ...overrides };
}

function makeSection(overrides: Partial<ReportSection> = {}): ReportSection {
  return { id: "s1", title: "Section Title", description: "Section description.", claims: [], collectionMatches: [], metrics: [], emptyReason: "Real empty reason.", ...overrides };
}

describe("ReportSectionView", () => {
  it("renders the real title and description", () => {
    render(<ReportSectionView section={makeSection()} />);
    expect(screen.getByRole("heading", { name: "Section Title" })).toBeInTheDocument();
    expect(screen.getByText("Section description.")).toBeInTheDocument();
  });

  it("honestly empty: shows the real, specific emptyReason, never a generic placeholder", () => {
    render(<ReportSectionView section={makeSection()} />);
    expect(screen.getByText("Real empty reason.")).toBeInTheDocument();
  });

  it("renders real claims via the existing EvidenceClaimCard", () => {
    render(<ReportSectionView section={makeSection({ claims: [makeClaim()] })} />);
    expect(screen.getByText("Real headline")).toBeInTheDocument();
  });

  it("renders real Smart Collection matches via the existing SmartCollectionMatchRow", () => {
    render(<ReportSectionView section={makeSection({ collectionMatches: [makeMatch()] })} />);
    expect(screen.getByText("Real reason.")).toBeInTheDocument();
  });

  it("renders real metrics as labeled statistics", () => {
    render(<ReportSectionView section={makeSection({ metrics: [{ label: "Average Confidence", value: "62%" }] })} />);
    expect(screen.getByText("Average Confidence")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("mixed content: claims, matches, and metrics all render together, never one silently dropped", () => {
    render(<ReportSectionView section={makeSection({ claims: [makeClaim()], collectionMatches: [makeMatch()], metrics: [{ label: "Stat", value: "1" }] })} />);
    expect(screen.getByText("Real headline")).toBeInTheDocument();
    expect(screen.getByText("Real reason.")).toBeInTheDocument();
    expect(screen.getByText("Stat")).toBeInTheDocument();
  });
});
