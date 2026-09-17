import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";

const mockAlerts: IntelligenceAlert[] = [];
const mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { ReportsIndexView } = await import("@/components/reports/ReportsIndexView");

describe("ReportsIndexView", () => {
  it("labels itself accurately: generated from the latest intelligence, never real-time/scheduled", () => {
    mockStatus = "ready";
    render(<ReportsIndexView initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getByRole("heading", { name: "AI Executive Reports", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/generated from the latest available Base Radar intelligence/)).toBeInTheDocument();
    expect(screen.getByText(/not a scheduled or background job/)).toBeInTheDocument();
  });

  it("renders all 6 report cards", () => {
    mockStatus = "ready";
    render(<ReportsIndexView initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  it("'checking': every card shows an honest in-progress label", () => {
    mockStatus = "loading";
    render(<ReportsIndexView initialBriefing={null} serverSmartCollections={[]} />);
    expect(screen.getAllByText("Checking…")).toHaveLength(6);
  });
});
