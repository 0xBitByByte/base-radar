import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const BASE_CHAIN_ID = 8453;
const UNSUPPORTED_CHAIN_ID = 1;

let mockAccount: { address: `0x${string}` | undefined; chain: unknown; chainId: number | undefined; connector: unknown; isConnected: boolean; isConnecting: boolean; isReconnecting: boolean };
let mockConnectors: unknown[] = [];
let mockConnectState: { mutate: ReturnType<typeof vi.fn>; isPending: boolean; error: unknown; reset: ReturnType<typeof vi.fn> };
let mockDisconnect: ReturnType<typeof vi.fn>;
let mockEnsName: string | undefined;
let mockSignMessageAsync: ReturnType<typeof vi.fn>;

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => mockAccount,
    useConnectors: () => mockConnectors,
    useConnect: () => mockConnectState,
    useDisconnect: () => ({ mutate: mockDisconnect }),
    useEnsName: () => ({ data: mockEnsName }),
    // Release 1 Phase D — `useWallet()` added a real `signMessageAsync`
    // (SIWE challenge-signing); mocked the same way every other wagmi
    // hook here already is, since there's no real `WagmiProvider` in this
    // test and the real hook would otherwise throw `WagmiProviderNotFoundError`.
    useSignMessage: () => ({ mutateAsync: mockSignMessageAsync }),
  };
});

const { useWallet } = await import("@/lib/hooks/useWallet");

function resetMocks() {
  mockAccount = { address: undefined, chain: undefined, chainId: undefined, connector: undefined, isConnected: false, isConnecting: false, isReconnecting: false };
  mockConnectors = [];
  mockConnectState = { mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() };
  mockDisconnect = vi.fn();
  mockEnsName = undefined;
  mockSignMessageAsync = vi.fn();
}
resetMocks();

describe("useWallet", () => {
  it("status is 'disconnected' when no wallet is connected and nothing is in flight", () => {
    resetMocks();
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeUndefined();
  });

  it("status is 'connecting' while a connection attempt is pending", () => {
    resetMocks();
    mockAccount.isConnecting = true;
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe("connecting");
    expect(result.current.isConnecting).toBe(true);
  });

  it("status is 'connecting' while reconnecting after a refresh", () => {
    resetMocks();
    mockAccount.isReconnecting = true;
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe("connecting");
  });

  it("status is 'connected' once connected on a real supported chain (Base)", () => {
    resetMocks();
    mockAccount = { address: "0xAbC1230000000000000000000000000000dEaD", chain: { id: BASE_CHAIN_ID }, chainId: BASE_CHAIN_ID, connector: { id: "coinbaseWalletSDK" }, isConnected: true, isConnecting: false, isReconnecting: false };
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe("connected");
    expect(result.current.isSupportedNetwork).toBe(true);
    expect(result.current.address).toBe("0xAbC1230000000000000000000000000000dEaD");
  });

  it("status is 'unsupported-network' when connected on a real chain Base Radar doesn't support", () => {
    resetMocks();
    mockAccount = { address: "0xAbC1230000000000000000000000000000dEaD", chain: { id: UNSUPPORTED_CHAIN_ID }, chainId: UNSUPPORTED_CHAIN_ID, connector: { id: "injected" }, isConnected: true, isConnecting: false, isReconnecting: false };
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe("unsupported-network");
    expect(result.current.isSupportedNetwork).toBe(false);
  });

  it("never claims 'unsupported-network' while genuinely disconnected — that status is reserved for a real connected-but-wrong-chain wallet", () => {
    resetMocks();
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).not.toBe("unsupported-network");
  });

  it("surfaces a real connect error via getWalletErrorMessage, never a raw error object", () => {
    resetMocks();
    // A real raw, unwrapped RPC error shape — the exact case `lib/wallet/errors.ts`'s own doc comment documents seeing live from MetaMask's injected connector.
    mockConnectState.error = { code: 4001, message: "User rejected the request." };
    const { result } = renderHook(() => useWallet());
    expect(result.current.connectError).toBe("Connection request declined.");
  });

  it("connectError is null when there is no real error", () => {
    resetMocks();
    const { result } = renderHook(() => useWallet());
    expect(result.current.connectError).toBeNull();
  });

  it("prefers a real resolved ENS name over the raw address, but never fabricates one", () => {
    resetMocks();
    mockAccount = { address: "0xAbC1230000000000000000000000000000dEaD", chain: { id: BASE_CHAIN_ID }, chainId: BASE_CHAIN_ID, connector: { id: "coinbaseWalletSDK" }, isConnected: true, isConnecting: false, isReconnecting: false };
    mockEnsName = "vitalik.eth";
    const { result } = renderHook(() => useWallet());
    expect(result.current.ensName).toBe("vitalik.eth");
  });

  it("ensName is honestly null (never undefined-as-truthy or a guess) when nothing resolved", () => {
    resetMocks();
    const { result } = renderHook(() => useWallet());
    expect(result.current.ensName).toBeNull();
  });

  it("exposes disconnect wired to wagmi's real mutate function", () => {
    resetMocks();
    const { result } = renderHook(() => useWallet());
    result.current.disconnect();
    expect(mockDisconnect).toHaveBeenCalledOnce();
  });

  it("Release 1 Phase D — exposes signMessageAsync wired to wagmi's real mutateAsync function", async () => {
    resetMocks();
    mockSignMessageAsync.mockResolvedValue("0xrealsignature");
    const { result } = renderHook(() => useWallet());

    const signature = await result.current.signMessageAsync({ message: "sign this" });
    expect(mockSignMessageAsync).toHaveBeenCalledWith({ message: "sign this" });
    expect(signature).toBe("0xrealsignature");
  });
});
