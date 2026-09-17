import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import type { AlertRefreshStatus } from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import { SERVER_EVALUATED_COLLECTION_IDS, SMART_COLLECTION_IDS } from "@/lib/smart-collections/types";
import type { SmartCollectionResult } from "@/lib/smart-collections/types";

let mockAlerts: IntelligenceAlert[] = [];
const mockDailyBrief: DailyBrief | null = null;
let mockStatus: AlertRefreshStatus = "ready";

vi.mock("@/lib/hooks/useEcosystemIntelligenceAlerts", () => ({ useEcosystemIntelligenceAlerts: () => mockAlerts }));
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => mockStatus }));

const { useSmartCollections } = await import("@/lib/hooks/useSmartCollections");

function makeServerResult(overrides: Partial<SmartCollectionResult> = {}): SmartCollectionResult {
  return { id: "ai-picks", name: "AI Picks", description: "desc", status: "ready", matches: [], lastEvaluatedAt: "2026-09-08T00:00:00.000Z", averageConfidence: null, ...overrides };
}

describe("useSmartCollections", () => {
  it("returns all 10 collections in the fixed SMART_COLLECTION_IDS order, merging server + client results", () => {
    mockStatus = "ready";
    const serverResults = SERVER_EVALUATED_COLLECTION_IDS.map((id) => makeServerResult({ id }));
    const { result } = renderHook(() => useSmartCollections(serverResults));
    expect(result.current.map((r) => r.id)).toEqual(SMART_COLLECTION_IDS);
  });

  it("omits a collection id with no result from either source, rather than fabricating a placeholder", () => {
    mockStatus = "ready";
    const { result } = renderHook(() => useSmartCollections([makeServerResult({ id: "ai-picks" })]));
    expect(result.current.map((r) => r.id)).not.toContain("low-risk");
  });

  it("server-evaluated results pass through unchanged", () => {
    mockStatus = "ready";
    const serverResults = [makeServerResult({ id: "ai-picks", matches: [{ projectId: "a", projectName: "A", projectSlug: "a", liveProject: null, reason: "r", evidence: [] }] })];
    const { result } = renderHook(() => useSmartCollections(serverResults));
    const aiPicks = result.current.find((r) => r.id === "ai-picks")!;
    expect(aiPicks.matches).toHaveLength(1);
  });

  it("client collections report 'checking' while the Alert Engine hasn't loaded, never evaluating", () => {
    mockStatus = "loading";
    mockAlerts = [{ id: "1", projectId: "a", projectName: "A", severity: "info", confidence: 70, headline: "h", summary: "s", signals: [], categories: [], score: 50, relatedAlertIds: [], timestamp: "2026-09-01T00:00:00.000Z", reasoning: "r", nextStep: "n", narrative: "stable" }];
    const { result } = renderHook(() => useSmartCollections([]));
    const stable = result.current.find((r) => r.id === "stable-projects")!;
    expect(stable.status).toBe("checking");
    expect(stable.matches).toEqual([]);
  });

  it("client collections report 'unavailable' on a real Alert Engine failure — the hard stale-data gate", () => {
    mockStatus = "error";
    const { result } = renderHook(() => useSmartCollections([]));
    const trending = result.current.find((r) => r.id === "trending-narratives")!;
    expect(trending.status).toBe("unavailable");
    expect(trending.matches).toEqual([]);
  });

  it("client collections evaluate real data once the Alert Engine is ready", () => {
    mockStatus = "ready";
    mockAlerts = [{ id: "1", projectId: "a", projectName: "A", severity: "info", confidence: 70, headline: "h", summary: "s", signals: [], categories: [], score: 50, relatedAlertIds: [], timestamp: "2026-09-01T00:00:00.000Z", reasoning: "r", nextStep: "n", narrative: "stable" }];
    const { result } = renderHook(() => useSmartCollections([]));
    const stable = result.current.find((r) => r.id === "stable-projects")!;
    expect(stable.status).toBe("ready");
    expect(stable.matches).toHaveLength(1);
  });
});
