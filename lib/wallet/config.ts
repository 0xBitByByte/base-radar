/**
 * V3-WALLET-001 — the one `wagmi` config this app creates. `mainnet` is
 * included alongside the two wallet-supported chains (`WALLET_SUPPORTED_CHAINS`)
 * SOLELY because ENS names only resolve against Ethereum Mainnet's registry
 * (`useEnsName` needs a configured transport for whichever `chainId` it's
 * asked to query) — it does not change which network a connected wallet is
 * considered "supported" on; `isSupportedWalletChain` (`chains.ts`) never
 * includes it. `ssr: true` plus the default `reconnectOnMount` on
 * `WagmiProvider` is what makes a wallet reconnect automatically after a
 * refresh (Session Persistence) — no custom persistence code needed, this
 * is `wagmi`'s own built-in behavior.
 *
 * Connector choice: `injected({ target: "metaMask" })`/`{ target: {id:
 * "rabby", ...} }`/`{ target: {id: "trustWallet", ...} }` each target one
 * specific wallet's real `window.ethereum` flag (never a generic "whatever
 * injected provider happens to be first"), `coinbaseWallet()` is Coinbase's
 * official SDK-backed connector, and `walletConnect()` is added only when
 * `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set — it requires a real
 * WalletConnect Cloud project id to function at all, so this app follows
 * the exact same "optional, unset by default, documented in .env.example"
 * convention `GITHUB_TOKEN`/`WHALE_PROVIDER` already use rather than
 * shipping a placeholder credential. No dedicated wagmi/official connector
 * package exists for Rabby or Trust Wallet (confirmed — neither publishes
 * one, unlike Coinbase's `@coinbase/wallet-sdk`), so `injected()` — the
 * wagmi-maintained, official mechanism for exactly this class of wallet —
 * targeted at each one's real flag is the correct, not a workaround,
 * choice for both.
 *
 * `multiInjectedProviderDiscovery: false` — confirmed live (V3-WALLET-001):
 * wagmi's default (`true`) auto-registers a SEPARATE connector for every
 * EIP-6963-announced wallet in addition to an explicit `injected({
 * target })`, so MetaMask rendered twice in the connect menu with it on.
 * This app deliberately offers a fixed, named connector list, not an
 * open-ended "whatever's installed" list, so auto-discovery stays off for
 * every injected target here, including the two added in V3-WALLET-001C —
 * turning it back on for just those two would reintroduce the exact
 * duplicate-connector bug this flag was set to prevent. Note this does
 * mean all four injected wallets rely on each wallet's legacy `window.
 * ethereum.isXxx` flag (`WalletProviderFlags`) rather than EIP-6963, which
 * wagmi's own types mark deprecated in favor of EIP-6963 — a real,
 * deliberate trade-off (consistency and no duplicates) documented here
 * rather than left implicit.
 */

import { createConfig, http, injected } from "wagmi";
import { coinbaseWallet, walletConnect } from "wagmi/connectors";
import { mainnet } from "viem/chains";

import { SITE, SITE_URL } from "@/constants/site";
import { WALLET_SUPPORTED_CHAINS } from "@/lib/wallet/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [...WALLET_SUPPORTED_CHAINS, mainnet],
  multiInjectedProviderDiscovery: false,
  // Display order (V3-WALLET-001C): Coinbase Wallet first (Base Radar is a
  // Base-ecosystem app), then MetaMask, Rabby Wallet, Trust Wallet, then
  // WalletConnect last when configured. `ConnectMenu`/`useConnectors()`
  // both preserve this exact array order — nothing re-sorts it downstream.
  connectors: [
    coinbaseWallet({ appName: SITE.name, appLogoUrl: `${SITE_URL}/icon-512.png` }),
    injected({ target: "metaMask" }),
    injected({ target: { id: "rabby", name: "Rabby Wallet", provider: "isRabby" } }),
    injected({
      target: {
        id: "trustWallet",
        name: "Trust Wallet",
        // Trust Wallet's extension has shipped both `isTrust` and
        // `isTrustWallet` across versions — checked together rather than
        // picking one, mirroring how `findProvider`'s own multi-injected
        // (`window.ethereum.providers[]`) resolution already works for a
        // single string flag, just with two flags instead of one.
        provider(window) {
          const ethereum = window?.ethereum;
          if (!ethereum) return undefined;
          if (ethereum.providers) return ethereum.providers.find((p) => p.isTrust || p.isTrustWallet);
          return ethereum.isTrust || ethereum.isTrustWallet ? ethereum : undefined;
        },
      },
    }),
    ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : []),
  ],
  transports: {
    [WALLET_SUPPORTED_CHAINS[0].id]: http(),
    [WALLET_SUPPORTED_CHAINS[1].id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
