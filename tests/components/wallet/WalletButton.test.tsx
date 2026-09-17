import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockWallet: {
  isConnected: boolean;
  isConnecting: boolean;
  isSupportedNetwork: boolean;
  address: `0x${string}` | undefined;
  ensName: string | null;
  chain: { id: number } | undefined;
  connector: unknown;
  connectors: { uid: string; id: string; name: string }[];
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connectError: string | null;
  resetConnectError: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/hooks/useWallet", () => ({ useWallet: () => mockWallet }));
vi.mock("@/lib/hooks/useConnectorAvailability", () => ({ useConnectorAvailability: () => null }));

const { WalletButton } = await import("@/components/wallet/WalletButton");

function resetWallet() {
  mockWallet = {
    isConnected: false,
    isConnecting: false,
    isSupportedNetwork: false,
    address: undefined,
    ensName: null,
    chain: undefined,
    connector: undefined,
    connectors: [],
    connect: vi.fn(),
    disconnect: vi.fn(),
    connectError: null,
    resetConnectError: vi.fn(),
  };
}
resetWallet();

describe("WalletButton", () => {
  it("disconnected: shows a real 'Connect wallet' trigger, not an account menu", () => {
    resetWallet();
    render(<WalletButton />);
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("connecting: the trigger is disabled and honestly says 'Connecting…', reserving the disconnected label's width", () => {
    resetWallet();
    mockWallet.isConnecting = true;
    render(<WalletButton />);
    const button = screen.getByRole("button", { name: "Connecting wallet…" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("connected on a supported network: shows the real ENS name or shortened address, not the Connect trigger", () => {
    resetWallet();
    mockWallet.isConnected = true;
    mockWallet.isSupportedNetwork = true;
    mockWallet.address = "0xAbC1230000000000000000000000000000dEaD";
    mockWallet.chain = { id: 8453 };
    render(<WalletButton />);
    expect(screen.queryByRole("button", { name: "Connect wallet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Wallet menu — 0xAbC1…dEaD/ })).toBeInTheDocument();
  });

  it("connected but on an unsupported network: the trigger's own accessible name says so", () => {
    resetWallet();
    mockWallet.isConnected = true;
    mockWallet.isSupportedNetwork = false;
    mockWallet.address = "0xAbC1230000000000000000000000000000dEaD";
    mockWallet.chain = { id: 1 };
    render(<WalletButton />);
    expect(screen.getByRole("button", { name: /unsupported network/ })).toBeInTheDocument();
  });

  it("prefers a real resolved ENS name over the shortened address when both exist", () => {
    resetWallet();
    mockWallet.isConnected = true;
    mockWallet.isSupportedNetwork = true;
    mockWallet.address = "0xAbC1230000000000000000000000000000dEaD";
    mockWallet.ensName = "vitalik.eth";
    mockWallet.chain = { id: 8453 };
    render(<WalletButton />);
    expect(screen.getByRole("button", { name: /Wallet menu — vitalik\.eth/ })).toBeInTheDocument();
  });
});
