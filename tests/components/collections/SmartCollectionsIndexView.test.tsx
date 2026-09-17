import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import { SERVER_EVALUATED_COLLECTION_IDS } from "@/lib/smart-collections/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

const mockAlerts: IntelligenceAlert[] = [];
const mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { SmartCollectionsIndexView } = await import("@/components/collections/SmartCollectionsIndexView");

function makeServerResults(): SmartCollectionResult[] {
  return SERVER_EVALUATED_COLLECTION_IDS.map((id) => ({ id, name: id, description: "desc", status: "ready" as const, matches: [], lastEvaluatedAt: "2026-09-08T00:00:00.000Z", averageConfidence: null }));
}

describe("SmartCollectionsIndexView", () => {
  it("labels itself accurately: evaluated from the latest intelligence, never real-time/monitored", () => {
    mockStatus = "ready";
    render(<SmartCollectionsIndexView serverResults={makeServerResults()} />);
    expect(screen.getByRole("heading", { name: "Smart Collections", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/evaluated from the latest available Base Radar/)).toBeInTheDocument();
    expect(screen.getByText(/not continuously monitored/)).toBeInTheDocument();
  });

  it("renders all 10 collections", () => {
    mockStatus = "ready";
    render(<SmartCollectionsIndexView serverResults={makeServerResults()} />);
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("client-evaluated collections show an honest 'checking' state while the Alert Engine loads", () => {
    mockStatus = "loading";
    render(<SmartCollectionsIndexView serverResults={makeServerResults()} />);
    expect(screen.getAllByText("Checking…").length).toBeGreaterThan(0);
  });
});
