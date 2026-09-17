import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

const CONFIG_KEY = "base-radar:ai-watch-config";
const ALERTS_KEY = "base-radar:ai-watch-alerts";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "daily-brief",
    category: "Risk",
    headline: "Real risk headline",
    summary: "Real summary.",
    confidence: { kind: "score", value: 70 },
    evidence: [],
    sources: [],
    projects: [{ id: "aave", name: "Aave", slug: "aave" }],
    generatedAt: "2026-09-08T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function seedAlert(claim: WorkspaceClaim) {
  window.localStorage.setItem(
    ALERTS_KEY,
    JSON.stringify({ version: 1, alerts: [{ id: `ai-watch:${claim.id}`, firstSeenAt: "2026-09-08T00:00:00.000Z", isRead: false, readAt: null, claim }] })
  );
}

function seedEnabled() {
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify({ version: 1, config: { enabled: true, createdAt: "2026-09-08T00:00:00.000Z" } }));
}

/** Same "simulated browser refresh" technique `tests/lib/ai-watch/storage.test.ts` established — resets the storage module's in-memory cache, then re-imports the component so it binds to the fresh module instance and re-hydrates from real jsdom `localStorage`. */
async function freshComponent() {
  vi.resetModules();
  const { WatchlistAIWatchStatus } = await import("@/components/watchlists/WatchlistAIWatchStatus");
  return WatchlistAIWatchStatus;
}

describe("WatchlistAIWatchStatus", () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(CONFIG_KEY);
    window.localStorage.removeItem(ALERTS_KEY);
  });

  it("renders nothing when AI Watch is off — no fabricated status", async () => {
    const Component = await freshComponent();
    render(<Component projectIds={["aave"]} />);
    expect(screen.queryByText(/AI Watch/)).not.toBeInTheDocument();
  });

  it("renders nothing when enabled but no unread alert names one of THIS watchlist's projects", async () => {
    seedEnabled();
    seedAlert(makeClaim({ projects: [{ id: "compound", name: "Compound", slug: "compound" }] }));
    const Component = await freshComponent();
    render(<Component projectIds={["aave"]} />);
    expect(screen.queryByText(/AI Watch/)).not.toBeInTheDocument();
  });

  it("shows a real count and links to AI Workspace when a real unread alert names this watchlist's project", async () => {
    seedEnabled();
    seedAlert(makeClaim());
    const Component = await freshComponent();
    render(<Component projectIds={["aave"]} />);
    const link = screen.getByRole("link", { name: /1 new AI Watch finding/ });
    expect(link).toHaveAttribute("href", "/dashboard/ai-workspace");
  });

  it("PR-090.07 QA fix — hydration safety: the server-rendered snapshot never reads live localStorage, even when real enabled+matching-alert data already exists (which real SSR, with no `window`, could never see) — a `useSyncExternalStore` server-snapshot function that read localStorage instead of a fixed default would mismatch the real server HTML and produce a hydration error", async () => {
    seedEnabled();
    seedAlert(makeClaim());
    const Component = await freshComponent();
    const html = renderToString(<Component projectIds={["aave"]} />);
    expect(html).not.toContain("AI Watch");
  });

  it("never counts an already-read alert", async () => {
    seedEnabled();
    const claim = makeClaim();
    window.localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify({ version: 1, alerts: [{ id: `ai-watch:${claim.id}`, firstSeenAt: "2026-09-08T00:00:00.000Z", isRead: true, readAt: "2026-09-08T01:00:00.000Z", claim }] })
    );
    const Component = await freshComponent();
    render(<Component projectIds={["aave"]} />);
    expect(screen.queryByText(/AI Watch/)).not.toBeInTheDocument();
  });
});
