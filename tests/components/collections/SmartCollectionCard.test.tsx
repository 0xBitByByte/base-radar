import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SmartCollectionCard } from "@/components/collections/SmartCollectionCard";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

function makeResult(overrides: Partial<SmartCollectionResult> = {}): SmartCollectionResult {
  return { id: "ai-picks", name: "AI Picks", description: "Real description.", status: "ready", matches: [], lastEvaluatedAt: "2026-09-08T00:00:00.000Z", averageConfidence: null, ...overrides };
}

describe("SmartCollectionCard", () => {
  it("links to the real collection detail route", () => {
    render(<SmartCollectionCard result={makeResult()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/collections/ai-picks");
  });

  it("shows the real match count and evaluated timestamp", () => {
    render(<SmartCollectionCard result={makeResult({ matches: [{ projectId: "a", projectName: "A", projectSlug: "a", liveProject: null, reason: "r", evidence: [] }] })} />);
    expect(screen.getByText("1 project")).toBeInTheDocument();
    expect(screen.getByText(/Evaluated/)).toBeInTheDocument();
  });

  it("shows real average confidence when present, omits it when null", () => {
    const { rerender } = render(<SmartCollectionCard result={makeResult({ averageConfidence: 82 })} />);
    expect(screen.getByText(/82% avg\. confidence/)).toBeInTheDocument();

    rerender(<SmartCollectionCard result={makeResult({ averageConfidence: null })} />);
    expect(screen.queryByText(/avg\. confidence/)).not.toBeInTheDocument();
  });

  it("'checking' status: an honest in-progress label, never a fabricated count", () => {
    render(<SmartCollectionCard result={makeResult({ status: "checking" })} />);
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText(/project/)).not.toBeInTheDocument();
  });

  it("'unavailable' status: an honest error label, never a fabricated count", () => {
    render(<SmartCollectionCard result={makeResult({ status: "unavailable" })} />);
    expect(screen.getByText("Can't evaluate right now")).toBeInTheDocument();
  });
});
