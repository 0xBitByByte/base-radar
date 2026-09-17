/**
 * V3-WALLET-001B — UI-layer only: maps a connector's real `id` (the exact
 * static strings `injected({target:"metaMask"})`/`coinbaseWallet()`/
 * `walletConnect()` are confirmed to report, per `wagmi`'s own installed
 * source — never a fabricated or guessed id) to a static official brand
 * asset under `/public/wallets/`. Presentational lookup data only — this
 * file changes no connection behavior, and `lib/wallet/config.ts` neither
 * imports nor is imported by it.
 *
 * Every asset here is the real, unmodified, official artwork — never
 * redrawn or hand-approximated — but sourced under two different legal
 * bases, kept straight below since they're not the same guarantee:
 *
 *   - `coinbase-wallet.svg` — the exact asset `@coinbase/wallet-sdk` (an
 *     official Coinbase package, and already an optional peer dependency
 *     of the `coinbaseWallet()` connector this app already uses) bundles
 *     internally as `dist/assets/wallet-logo.js`, under that package's own
 *     Apache-2.0 license — decoded from its data: URI form.
 *   - `walletconnect.svg` — fetched directly from WalletConnect's own
 *     `WalletConnect/walletconnect-assets` GitHub repository (confirmed
 *     MIT-licensed via the GitHub API's own license metadata for that
 *     repo), `Icon/Blue (Default)/Icon.svg`.
 *   These two carry an actual redistribution license — no restriction
 *   beyond the license terms themselves.
 *
 *   - `metamask.svg` — MetaMask's own `MetaMask-icon-fox.svg`, fetched
 *     directly from metamask.io's own asset CDN (`images.ctfassets.net`),
 *     the identical file their own metamask.io/assets brand page serves.
 *   - `rabby-wallet.svg` — Rabby's `symbol.svg` from their dedicated
 *     `RabbyHub/logo` brand-assets GitHub repository.
 *   - `trust-wallet.svg` — Trust Wallet's own `icon.svg`, served live from
 *     trustwallet.com itself (their own site's app icon).
 *   None of these three carry a copyright license permitting redistribution
 *   (confirmed: no LICENSE file on `brand-resources` or `RabbyHub/logo`,
 *   no redistribution terms on either's brand page; Trust Wallet's press
 *   kit states only "don't alter colour/rotation," not a redistribution
 *   grant). V3-WALLET-001E's explicit instruction was to use them anyway,
 *   on nominative trademark fair use — showing a wallet's own unaltered
 *   mark strictly to identify it as a connection option, exactly the
 *   "Connect with X" picker use every other wallet-connector UI in the
 *   ecosystem (RainbowKit, Web3Modal, wagmi's own docs) already relies on.
 *   That's a materially weaker guarantee than an actual license: it holds
 *   only as long as the mark stays unaltered and nothing here implies an
 *   official partnership — both true today, worth re-checking if either
 *   ever changes.
 */

export const CONNECTOR_ICON_SRC: Record<string, string> = {
  coinbaseWalletSDK: "/wallets/coinbase-wallet.svg",
  metaMask: "/wallets/metamask.svg",
  rabby: "/wallets/rabby-wallet.svg",
  trustWallet: "/wallets/trust-wallet.svg",
  walletConnect: "/wallets/walletconnect.svg",
};
