/**
 * V3-WALLET-001C — the shared per-connector metadata `WalletButton.tsx`'s
 * picker (and any future connector badge) reads from, keyed by each
 * connector's real `id` (the exact same ids `lib/wallet/config.ts`
 * configures and `lib/wallet/connectorIcons.tsx` already keys its icon map
 * by — one id space, never redefined). Presentational only: `description`
 * is app-authored copy (wagmi's `Connector` type has no such field), and
 * `providerFlag` only exists to power the picker's honest "Installed"/"Not
 * Installed" hint — it never feeds into `lib/wallet/config.ts`'s actual
 * connector construction or the real `connect()` call, both of which keep
 * using wagmi's own detection regardless of what this hints.
 *
 * `providerFlag` is set for every connector including `coinbaseWalletSDK`
 * (`isCoinbaseWallet` — confirmed real, per Coinbase's own developer docs)
 * — but `installUrl` is deliberately absent for it and for `walletConnect`,
 * and that absence is the signal `WalletButton.tsx`'s badge logic actually
 * keys off: both connect successfully with nothing installed (Coinbase
 * Wallet's SDK falls back to its own popup flow; WalletConnect always shows
 * a QR modal), so a flat "Not Installed" would be a false negative — read
 * as "this won't work," when it will. Without an `installUrl`, the badge
 * only ever shows the positive "Installed" state (a real, useful signal:
 * the extension will be used directly instead of the popup) and stays
 * silent rather than showing "Not Installed" when absent. `installUrl`
 * being set is what flips a connector into showing the negative state too
 * — it's only set for the three connectors that have NO working fallback
 * when genuinely absent (confirmed live, V3-WALLET-001C — clicking an
 * uninstalled MetaMask/Rabby/Trust Wallet just errors, nothing opens) —
 * `WalletButton.tsx` uses its presence to turn that dead-end error into a
 * real link to the wallet's own official install page instead. Every URL
 * here was independently verified live against each project's own real
 * domain (V3-WALLET-001E/F) before being added — never guessed, and never
 * one of the many phishing lookalikes that outrank the real pages in a
 * plain web search for these wallets.
 */

export type ConnectorMetadata = {
  description: string;
  /** The real `window.ethereum` flag(s) this wallet's injected provider sets, when checking one applies (see the doc comment above). An array when a wallet has shipped more than one flag across versions — any one being true counts as installed. */
  providerFlag?: string | string[];
  /** The wallet's own official install/download page — set only when clicking this connector while genuinely absent has no other working fallback (see the doc comment above). Its presence/absence also gates whether the picker ever shows a negative "Not Installed" badge for this connector at all. */
  installUrl?: string;
};

export const CONNECTOR_METADATA: Record<string, ConnectorMetadata> = {
  coinbaseWalletSDK: { description: "Recommended for Base", providerFlag: "isCoinbaseWallet" },
  metaMask: { description: "Browser Extension", providerFlag: "isMetaMask", installUrl: "https://metamask.io/download" },
  rabby: { description: "Browser Extension", providerFlag: "isRabby", installUrl: "https://rabby.io" },
  // Same two flags `lib/wallet/config.ts`'s own `trustWallet` connector target checks.
  trustWallet: {
    description: "Mobile & Extension",
    providerFlag: ["isTrust", "isTrustWallet"],
    installUrl: "https://trustwallet.com/browser-extension",
  },
};
