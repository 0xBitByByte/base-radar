import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WalletVerificationHarness } from "@/components/wallet/dev/WalletVerificationHarness";
import { buildWalletVerificationFixtures } from "@/lib/dev/walletFixtures";

const STORAGE_KEY = "base-radar:guided-review";

describe("WalletVerificationHarness", () => {
  it("mounts every Wallet section over the default (clean) fixtures with zero flagged assertions, no crash", () => {
    window.localStorage.removeItem(STORAGE_KEY);
    render(<WalletVerificationHarness bundle={buildWalletVerificationFixtures()} />);

    expect(screen.getByText("Developer Assertions (0)")).toBeInTheDocument();
    expect(screen.getAllByText("Portfolio Health").length).toBeGreaterThan(0);
    expect(screen.getByText("Automation Status")).toBeInTheDocument();
    expect(screen.getByText("Guided Portfolio Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share/ })).toBeInTheDocument();
  });

  it("surfaces a real flagged assertion when the injected bundle genuinely has one", () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const bundle = buildWalletVerificationFixtures({
      automationResults: [
        { id: "automation:dup", ruleId: "wallet-rule:health", notificationId: "n1", title: "t", summary: "s", status: "triggered", triggeredAt: "2026-08-10T00:00:00.000Z", projectId: null, projectName: null, priority: "medium", link: null, metadata: {} },
        { id: "automation:dup", ruleId: "wallet-rule:health", notificationId: "n1", title: "t", summary: "s", status: "triggered", triggeredAt: "2026-08-10T00:00:00.000Z", projectId: null, projectName: null, priority: "medium", link: null, metadata: {} },
      ],
    });
    render(<WalletVerificationHarness bundle={bundle} />);
    expect(screen.getByText("Developer Assertions (1)")).toBeInTheDocument();
  });

  it("renders honest empty states, never a crash, when intelligence/ai are null", () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const bundle = buildWalletVerificationFixtures({ intelligence: null, ai: null });
    render(<WalletVerificationHarness bundle={bundle} />);
    expect(screen.queryByText("Portfolio Health")).not.toBeInTheDocument();
    expect(screen.getByText("Automation Status")).toBeInTheDocument();
  });
});
