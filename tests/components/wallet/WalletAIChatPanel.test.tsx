import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletAIChatPanel } from "@/components/wallet/WalletAIChatPanel";
import type { UseAIChatResult } from "@/lib/hooks/useAIChat";
import type { AIChatResponse } from "@/lib/ai-chat/types";

function makeChat(overrides: Partial<UseAIChatResult> = {}): UseAIChatResult {
  return {
    turns: [],
    ask: vi.fn(),
    clearConversation: vi.fn(),
    suggestedQuestions: [],
    hasData: true,
    ...overrides,
  };
}

const SAMPLE_RESPONSE: AIChatResponse = {
  questionId: "largestHolding",
  question: "What is my largest holding?",
  answered: true,
  answer: "Your largest holding is ETH, 50.0% of known value ($5,000).",
  facts: [{ label: "Symbol", value: "ETH" }],
  sources: ["Portfolio Intelligence — Largest Holding"],
};

describe("WalletAIChatPanel", () => {
  it("NO WALLET DATA: shows an honest empty state, no crash", () => {
    render(<WalletAIChatPanel chat={makeChat({ hasData: false })} />);
    expect(screen.getByText("No wallet data yet")).toBeInTheDocument();
  });

  it("no turns yet: shows the getting-started hint, no conversation log", () => {
    render(<WalletAIChatPanel chat={makeChat()} />);
    expect(screen.getByText(/Pick a question below/)).toBeInTheDocument();
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("clicking a suggested question calls ask() with the real question id — never free text", async () => {
    const user = userEvent.setup();
    const ask = vi.fn();
    render(<WalletAIChatPanel chat={makeChat({ suggestedQuestions: [{ id: "largestHolding", prompt: "What is my largest holding?" }], ask })} />);

    await user.click(screen.getByRole("button", { name: "What is my largest holding?" }));

    expect(ask).toHaveBeenCalledWith("largestHolding");
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("renders a real conversation turn — question, answer, and its real facts", () => {
    render(<WalletAIChatPanel chat={makeChat({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-06T00:00:00.000Z" }] })} />);

    expect(screen.getByRole("log")).toBeInTheDocument();
    expect(screen.getByText("What is my largest holding?")).toBeInTheDocument();
    expect(screen.getByText("Your largest holding is ETH, 50.0% of known value ($5,000).")).toBeInTheDocument();
    expect(screen.getByText("Symbol")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
  });

  it("'Clear Conversation' only appears once there's a real conversation, and calls clearConversation()", async () => {
    const user = userEvent.setup();
    const clearConversation = vi.fn();
    render(<WalletAIChatPanel chat={makeChat({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-06T00:00:00.000Z" }], clearConversation })} />);

    const clearButton = screen.getByRole("button", { name: /Clear Conversation/ });
    await user.click(clearButton);
    expect(clearConversation).toHaveBeenCalledTimes(1);
  });

  it("no 'Clear Conversation' button when there are no turns yet", () => {
    render(<WalletAIChatPanel chat={makeChat()} />);
    expect(screen.queryByRole("button", { name: /Clear Conversation/ })).not.toBeInTheDocument();
  });

  it("'Export Conversation' triggers a real browser download of the real transcript, only once there's a real conversation", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => `blob:mock-url:${blob.type}`);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<WalletAIChatPanel chat={makeChat({ turns: [{ response: SAMPLE_RESPONSE, askedAt: "2026-09-06T00:00:00.000Z" }] })} />);

    expect(screen.queryByRole("button", { name: /Export Conversation/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Export Conversation/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveReturnedWith("blob:mock-url:text/markdown");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url:text/markdown");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("no 'Export Conversation' button when there are no turns yet", () => {
    render(<WalletAIChatPanel chat={makeChat()} />);
    expect(screen.queryByRole("button", { name: /Export Conversation/ })).not.toBeInTheDocument();
  });

  it("no suggested-questions row when nothing is genuinely suggested", () => {
    render(<WalletAIChatPanel chat={makeChat({ suggestedQuestions: [] })} />);
    expect(screen.queryByText("Suggested Questions")).not.toBeInTheDocument();
  });

  // Bug fix regression coverage — a connected wallet was incorrectly shown
  // "Connect a wallet to ask questions about your portfolio," regardless of
  // WHY there was no data yet (still loading, a real fetch error, or
  // genuinely zero holdings). `walletStatus` now selects the precise
  // reason; only the genuinely disconnected case still shows that message.
  describe("walletStatus — precise reasons, never a wrong 'Connect a wallet' for a connected user", () => {
    it("1. CONNECTED + data available (walletStatus: ready): renders the usable chat, not an empty state", () => {
      render(
        <WalletAIChatPanel
          chat={makeChat({ hasData: true, suggestedQuestions: [{ id: "largestHolding", prompt: "What is my largest holding?" }] })}
          walletStatus={{ kind: "ready" }}
        />
      );
      expect(screen.queryByText("No wallet data yet")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "What is my largest holding?" })).toBeInTheDocument();
    });

    it("2. CONNECTED + holdings still loading: an accurate loading state, never 'Connect a wallet'", () => {
      render(<WalletAIChatPanel chat={makeChat({ hasData: false })} walletStatus={{ kind: "loading" }} />);
      expect(screen.getByText("Loading your wallet data…")).toBeInTheDocument();
      expect(screen.queryByText(/Connect a wallet/)).not.toBeInTheDocument();
    });

    it("3. CONNECTED + portfolio fetch error: an accurate error state showing the real error message, never 'Connect a wallet'", () => {
      render(<WalletAIChatPanel chat={makeChat({ hasData: false })} walletStatus={{ kind: "error", message: "Couldn't load your holdings. Please try again." }} />);
      expect(screen.getByText("Couldn't load wallet data")).toBeInTheDocument();
      expect(screen.getByText("Couldn't load your holdings. Please try again.")).toBeInTheDocument();
      expect(screen.queryByText(/Connect a wallet/)).not.toBeInTheDocument();
    });

    it("4. CONNECTED + no holdings: an accurate no-holdings state, never 'Connect a wallet'", () => {
      render(<WalletAIChatPanel chat={makeChat({ hasData: false })} walletStatus={{ kind: "no-holdings" }} />);
      expect(screen.getByText("No holdings to analyze")).toBeInTheDocument();
      expect(screen.queryByText(/Connect a wallet/)).not.toBeInTheDocument();
    });

    it("5. DISCONNECTED: still shows the real 'Connect a wallet' message — the one case it's actually correct for", () => {
      render(<WalletAIChatPanel chat={makeChat({ hasData: false })} walletStatus={{ kind: "disconnected" }} />);
      expect(screen.getByText("No wallet data yet")).toBeInTheDocument();
      expect(screen.getByText("Connect a wallet to ask questions about your portfolio.")).toBeInTheDocument();
    });

    it("omitting walletStatus entirely falls back to the original hasData-only check — unchanged for any caller that doesn't pass it", () => {
      render(<WalletAIChatPanel chat={makeChat({ hasData: false })} />);
      expect(screen.getByText("No wallet data yet")).toBeInTheDocument();
    });
  });
});
