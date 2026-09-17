import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/wallet/config.ts` reads `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` at
 * module load time, so each case needs its own fresh module instance
 * (`vi.resetModules()` + a dynamic `import()` after stubbing the env var) —
 * mutating `process.env` after the module has already loaded wouldn't
 * affect the already-constructed `wagmiConfig`.
 */
describe("wagmiConfig connectors", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("omits WalletConnect when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is unset, keeping the other 4 in their configured order", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "");
    vi.resetModules();
    const { wagmiConfig } = await import("@/lib/wallet/config");

    const ids = wagmiConfig.connectors.map((connector) => connector.id);
    expect(ids).toEqual(["coinbaseWalletSDK", "metaMask", "rabby", "trustWallet"]);
  });

  it("includes WalletConnect last when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
    vi.resetModules();
    const { wagmiConfig } = await import("@/lib/wallet/config");

    const ids = wagmiConfig.connectors.map((connector) => connector.id);
    expect(ids).toEqual(["coinbaseWalletSDK", "metaMask", "rabby", "trustWallet", "walletConnect"]);
  });

  it("never registers a duplicate connector id", async () => {
    vi.resetModules();
    const { wagmiConfig } = await import("@/lib/wallet/config");
    const ids = wagmiConfig.connectors.map((connector) => connector.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("always includes Base Mainnet and Base Sepolia as wallet-supported chains, regardless of WalletConnect config", async () => {
    vi.resetModules();
    const { wagmiConfig } = await import("@/lib/wallet/config");
    const chainIds = wagmiConfig.chains.map((chain) => chain.id);
    expect(chainIds).toEqual(expect.arrayContaining([8453, 84532]));
  });
});
