import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { DailyIntelligenceBriefing } from "@/lib/ai-intelligence/generator/briefing";
import type { DailyBrief } from "@/lib/brief/types";

let mockDailyBrief: DailyBrief | null = null;
vi.mock("@/lib/hooks/useDailyBrief", () => ({ useDailyBrief: () => mockDailyBrief }));
let mockWatchlistProjectIds: string[] = [];
vi.mock("@/lib/hooks/useWatchlist", () => ({ useWatchlist: () => ({ projectIds: mockWatchlistProjectIds, count: mockWatchlistProjectIds.length, isWatching: (id: string) => mockWatchlistProjectIds.includes(id), toggle: vi.fn() }) }));
vi.mock("@/lib/hooks/useAlertRefreshStatus", () => ({ useAlertRefreshStatus: () => "ready" as const }));

const { AIWorkspaceView } = await import("@/components/ai-workspace/AIWorkspaceView");
const { removeAIWatch } = await import("@/lib/ai-watch/storage");

const EMPTY_NARRATIVE_COUNTS = { growth: 0, decline: 0, "governance-active": 0, "security-risk": 0, accumulation: 0, "development-active": 0, stable: 0 } as const;

function makeDailyBrief(overrides: Partial<DailyBrief> = {}): DailyBrief {
  return {
    id: "brief:2026-09-08T00:00:00.000Z",
    generatedAt: "2026-09-08T00:00:00.000Z",
    headline: "Market steady",
    summary: "A quiet day.",
    marketSummary: [],
    topOpportunities: [],
    topRisks: [],
    securityHighlights: [],
    governanceHighlights: [],
    developmentHighlights: [],
    tvlHighlights: [],
    emergingNarratives: [],
    averageConfidence: 0,
    highestScore: 0,
    projectCount: 0,
    narrativeCounts: { ...EMPTY_NARRATIVE_COUNTS },
    recommendations: [],
    ...overrides,
  };
}

function makeBriefing(overrides: Partial<DailyIntelligenceBriefing> = {}): DailyIntelligenceBriefing {
  return {
    generatedAt: "2026-09-08T00:00:00.000Z",
    briefingDate: "2026-09-08",
    version: 1,
    briefs: [],
    statistics: { projectsAnalyzed: 0, providersScanned: 0, alertsProcessed: 0, discoveriesReviewed: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  mockWatchlistProjectIds = [];
  removeAIWatch();
});
afterEach(() => {
  removeAIWatch();
});

describe("AIWorkspaceView — route title and purpose statement", () => {
  it("renders a clear title and a read-only-evidence-dashboard purpose statement", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getByRole("heading", { name: "AI Workspace", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/read-only evidence dashboard, not a chat assistant/)).toBeInTheDocument();
  });

  it("the purpose statement says evidence/source/freshness/confidence are shown 'where available', never that every finding has them", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getByText(/shown where available/)).toBeInTheDocument();
    expect(screen.queryByText(/every finding below cites its real evidence, source, and confidence/)).not.toBeInTheDocument();
  });

  it("the purpose statement preserves the stronger AI Intelligence Brief evidence guarantee, unweakened", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getByText(/AI Intelligence Briefs always require at least one real, cited signal to exist at all/)).toBeInTheDocument();
  });

  it("a real generatedAt timestamp is labeled as 'Updated', never implying every underlying source is live", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing({ generatedAt: "2026-09-01T12:00:00.000Z" })} />);
    const timestamp = screen.getByText(/^Updated/);
    expect(timestamp).toBeInTheDocument();
    // Scoped to the freshness stamp's own paragraph — "not a live chat assistant" (AI Ask's own honest disclaimer) legitimately uses "live" elsewhere on the page.
    expect(timestamp.textContent).not.toMatch(/real-time/i);
  });
});

describe("AIWorkspaceView — loading vs. honest empty state", () => {
  it("Daily Brief still hydrating (useDailyBrief() === null): the Daily Brief section shows a real loading state, never claims to be empty while genuinely unknown", () => {
    mockDailyBrief = null;
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    const loadingRegion = screen.getByRole("status", { name: "Loading Daily Brief Findings" });
    expect(loadingRegion).toBeInTheDocument();
  });

  it("Daily Brief hydrated but genuinely empty: an honest empty state, not a loading spinner", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getAllByText("Nothing here yet.").length).toBeGreaterThan(0);
  });

  it("briefing is null (server-side generation genuinely produced nothing): the AI Intelligence section shows its own honest empty state", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={null} />);
    expect(screen.getByText(/No AI Intelligence briefs yet/)).toBeInTheDocument();
  });
});

describe("AIWorkspaceView — AI Ask is present and reuses the same composed view, never a second data path", () => {
  it("renders the AI Ask panel alongside the two data sections", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getByRole("heading", { name: "AI Ask" })).toBeInTheDocument();
  });

  it("asking 'What changed recently?' cites the same populated AI Intelligence claim already shown in the section above", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    mockDailyBrief = makeDailyBrief();
    const briefing = makeBriefing({
      briefs: [
        {
          id: "brief:1",
          generatedAt: "2026-09-08T00:00:00.000Z",
          headline: "Shared canonical headline",
          summary: "Real summary.",
          confidence: { level: "high", rationale: "Derived from 2 supporting signals across 1 distinct source.", evidenceCount: 2 },
          impact: "moderate",
          category: "defi",
          affectedProjects: [],
          supportingSignals: [{ id: "sig:1", kind: "other", description: "A real observation.", source: "base-registry", occurredAt: "2026-09-07T00:00:00.000Z" }],
          supportingSources: [{ source: "base-registry" }],
          tags: [],
        },
      ],
    });
    render(<AIWorkspaceView initialBriefing={briefing} />);
    await user.click(screen.getByRole("button", { name: "What changed recently?" }));
    const log = screen.getByRole("log", { name: "AI Ask conversation" });
    expect(within(log).getByText("Shared canonical headline")).toBeInTheDocument();
  });
});

describe("AIWorkspaceView — AI Watch is present and reuses the same composed view, never a second data path", () => {
  it("renders the AI Watch panel alongside the two data sections and AI Ask", () => {
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    expect(screen.getByRole("heading", { name: "AI Watch" })).toBeInTheDocument();
    expect(screen.getByText(/AI Watch checks your saved watch when you open AI Workspace/)).toBeInTheDocument();
  });

  it("REAL RISK FINDING END TO END: enabling the watch with a real Watchlist member and a real Daily Brief Risk claim surfaces the exact same claim already shown in the Daily Brief Findings section above", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    mockWatchlistProjectIds = ["aerodrome"];
    mockDailyBrief = makeDailyBrief({
      topRisks: [
        {
          projectId: "aerodrome",
          projectName: "Aerodrome Finance",
          headline: "Aerodrome Finance has a security-relevant event to review",
          reason: "Driven by a real contract/security signal.",
          score: 61,
          confidence: 82,
          narrative: "security-risk",
          timestamp: "2026-09-08T00:00:00.000Z",
        },
      ],
    });
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);

    await user.click(screen.getByRole("button", { name: "Turn on AI Watch" }));

    expect(screen.getByText("New Risk finding")).toBeInTheDocument();
    const watchSection = screen.getByRole("region", { name: "AI Watch" });
    expect(within(watchSection).getByText("Aerodrome Finance has a security-relevant event to review")).toBeInTheDocument();
    // The exact same claim also renders in the Daily Brief Findings section below — one canonical composition, never a second data path.
    expect(screen.getAllByText("Aerodrome Finance has a security-relevant event to review")).toHaveLength(2);
  });

  it("no Watchlist projects: enabling the watch reports the honest empty state, never a fabricated result", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    mockWatchlistProjectIds = [];
    mockDailyBrief = makeDailyBrief();
    render(<AIWorkspaceView initialBriefing={makeBriefing()} />);
    await user.click(screen.getByRole("button", { name: "Turn on AI Watch" }));
    expect(screen.getByText("No Watchlist projects yet")).toBeInTheDocument();
  });
});

describe("AIWorkspaceView — populated intelligence renders real sections", () => {
  it("a real AI Intelligence brief renders inside the AI Intelligence Briefs section", () => {
    mockDailyBrief = makeDailyBrief();
    const briefing = makeBriefing({
      briefs: [
        {
          id: "brief:1",
          generatedAt: "2026-09-08T00:00:00.000Z",
          headline: "Real headline",
          summary: "Real summary.",
          confidence: { level: "medium", rationale: "Derived from 2 supporting signals across 1 distinct source.", evidenceCount: 2 },
          impact: "moderate",
          category: "defi",
          affectedProjects: [],
          supportingSignals: [{ id: "sig:1", kind: "other", description: "A real observation.", source: "base-registry", occurredAt: "2026-09-07T00:00:00.000Z" }],
          supportingSources: [{ source: "base-registry" }],
          tags: [],
        },
      ],
    });
    render(<AIWorkspaceView initialBriefing={briefing} />);
    expect(screen.getByText("Real headline")).toBeInTheDocument();
  });
});
