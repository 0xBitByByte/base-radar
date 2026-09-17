import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AIWatchPanel } from "@/components/ai-workspace/AIWatchPanel";
import type { UseAIWatchResult } from "@/lib/hooks/useAIWatch";
import type { AIWatchAlert } from "@/lib/ai-watch/types";
import type { WorkspaceClaim } from "@/lib/ai-workspace/types";

function makeClaim(overrides: Partial<WorkspaceClaim> = {}): WorkspaceClaim {
  return {
    id: "claim:1",
    origin: "ai-intelligence",
    category: "security",
    headline: "Contract concern on Aerodrome",
    summary: "A real, evidence-backed summary.",
    confidence: { kind: "level", level: "high", rationale: "Derived from 2 supporting signals.", evidenceCount: 2 },
    evidence: [],
    sources: [{ label: "DefiLlama" }],
    projects: [{ id: "aerodrome", name: "Aerodrome Finance", slug: "aerodrome-finance" }],
    generatedAt: "2026-09-01T00:00:00.000Z",
    limitation: null,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<AIWatchAlert> = {}): AIWatchAlert {
  return { id: "ai-watch:claim:1", firstSeenAt: "2026-09-08T00:00:00.000Z", isRead: false, readAt: null, claim: makeClaim(), ...overrides };
}

function makeWatch(overrides: Partial<UseAIWatchResult> = {}): UseAIWatchResult {
  return {
    status: "ready",
    enabled: false,
    exists: false,
    watchlistProjectCount: 1,
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

describe("AIWatchPanel — accurate, non-misleading labeling", () => {
  it("describes itself as checking on-visit, never as background/continuous/real-time monitoring", () => {
    render(<AIWatchPanel watch={makeWatch()} />);
    expect(screen.getByRole("heading", { name: "AI Watch" })).toBeInTheDocument();
    expect(screen.getByText(/AI Watch checks your saved watch when you open AI Workspace/)).toBeInTheDocument();
    expect(screen.getByText(/it doesn't run in the background/)).toBeInTheDocument();
    expect(screen.queryByText(/real-time/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continuously/i)).not.toBeInTheDocument();
  });
});

describe("AIWatchPanel — create / enable / disable / remove lifecycle", () => {
  it("never-created state: shows the enable action, no remove action", () => {
    render(<AIWatchPanel watch={makeWatch({ exists: false, enabled: false })} />);
    expect(screen.getByRole("button", { name: "Turn on AI Watch" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove Watch/ })).not.toBeInTheDocument();
  });

  it("clicking 'Turn on AI Watch' calls enable()", async () => {
    const user = userEvent.setup();
    const enable = vi.fn();
    render(<AIWatchPanel watch={makeWatch({ enable })} />);
    await user.click(screen.getByRole("button", { name: "Turn on AI Watch" }));
    expect(enable).toHaveBeenCalledTimes(1);
  });

  it("disabled-but-exists state: shows both re-enable and remove actions", () => {
    render(<AIWatchPanel watch={makeWatch({ exists: true, enabled: false })} />);
    expect(screen.getByRole("button", { name: "Turn on AI Watch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove Watch/ })).toBeInTheDocument();
  });

  it("enabled state shows 'Turn off' and 'Remove Watch', both wired to their real handlers", async () => {
    const user = userEvent.setup();
    const disable = vi.fn();
    const remove = vi.fn();
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, disable, remove })} />);
    await user.click(screen.getByRole("button", { name: "Turn off AI Watch" }));
    expect(disable).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Remove Watch/ }));
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("AIWatchPanel — honest status states, enabled", () => {
  it("'checking': shows a real loading region, no fabricated results", () => {
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "checking" })} />);
    expect(screen.getByRole("status", { name: "Checking AI Watch" })).toBeInTheDocument();
  });

  it("'unavailable' (the hard stale-data gate): an honest 'can't check right now' message, never a fabricated result", () => {
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "unavailable" })} />);
    expect(screen.getByText("Can't check right now")).toBeInTheDocument();
    expect(screen.getByText(/never checks against stale or missing data/)).toBeInTheDocument();
  });

  it("'ready' with zero Watchlist projects: an honest, specific empty state", () => {
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", watchlistProjectCount: 0 })} />);
    expect(screen.getByText("No Watchlist projects yet")).toBeInTheDocument();
  });

  it("'ready' with Watchlist projects but zero alerts: an honest 'nothing new' state, not an error", () => {
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", watchlistProjectCount: 1, alerts: [] })} />);
    expect(screen.getByText("Nothing new yet")).toBeInTheDocument();
  });
});

describe("AIWatchPanel — a real fired alert, rendered via the same EvidenceClaimCard the sections use", () => {
  it("shows the underlying claim's real headline, evidence, and a 'New Risk finding' label", () => {
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", alerts: [makeAlert()] })} />);
    expect(screen.getByText("New Risk finding")).toBeInTheDocument();
    expect(screen.getByText("Contract concern on Aerodrome")).toBeInTheDocument();
    expect(screen.getByText("A real, evidence-backed summary.")).toBeInTheDocument();
  });

  it("clicking mark-as-read calls markRead with the real alert id", async () => {
    const user = userEvent.setup();
    const markRead = vi.fn();
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", alerts: [makeAlert()], markRead })} />);
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(markRead).toHaveBeenCalledWith("ai-watch:claim:1");
  });

  it("a read alert shows a mark-as-unread control instead", async () => {
    const user = userEvent.setup();
    const markUnread = vi.fn();
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", alerts: [makeAlert({ isRead: true, readAt: "2026-09-08T01:00:00.000Z" })], markUnread })} />);
    await user.click(screen.getByRole("button", { name: "Mark as unread" }));
    expect(markUnread).toHaveBeenCalledWith("ai-watch:claim:1");
  });

  it("renders multiple fired alerts, each with its own real claim content", () => {
    const second = makeAlert({ id: "ai-watch:claim:2", claim: makeClaim({ id: "claim:2", headline: "Declining confidence on Aave" }) });
    render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", alerts: [makeAlert(), second] })} />);
    expect(screen.getByText("Contract concern on Aerodrome")).toBeInTheDocument();
    expect(screen.getByText("Declining confidence on Aave")).toBeInTheDocument();
    expect(screen.getAllByText("New Risk finding")).toHaveLength(2);
  });

  it("HYDRATION SAFETY REGRESSION — never nests an <li> inside another <li>: EvidenceClaimCard's own root is already an <li>, so the AI Watch alert list must use plain list-role divs, never a second <li> wrapper (the exact bug caught in live browser QA)", () => {
    const { container } = render(<AIWatchPanel watch={makeWatch({ enabled: true, exists: true, status: "ready", alerts: [makeAlert()] })} />);
    expect(container.querySelectorAll("li li")).toHaveLength(0);
    expect(container.querySelector('[role="list"][aria-label="AI Watch alerts"]')).toBeInTheDocument();
  });
});
