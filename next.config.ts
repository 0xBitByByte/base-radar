import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Staging deployment (Fly.io, `Dockerfile`) — produces `.next/standalone`,
   * a minimal self-contained server bundle plus only the `node_modules`
   * actually traced as used, so the runtime image doesn't need a full
   * `npm install`. `node:sqlite` needs no entry here — it's a Node
   * built-in, not a package, so there's nothing for the trace to copy;
   * it's already part of the `node:22` base image the Dockerfile runs on.
   * Has no effect on `next dev`/local `next build` — this only changes
   * what `next build` additionally emits for Docker to copy.
   *
   * Vercel build failure fix — gated on `process.env.VERCEL` (Vercel's own
   * system env var, set unconditionally during every Vercel build, never
   * needed to be configured here). Confirmed live: with `output:
   * "standalone"` set unconditionally, Vercel's own build completes
   * TypeScript compilation and static generation successfully, then fails
   * in its own `onBuildComplete` step with `ENOENT: no such file or
   * directory, open '/vercel/path0/.next/next-server.js.nft.json'` — a
   * known Next.js 16.3 + Vercel incompatibility: Vercel's builder does its
   * own output-file-tracing/packaging and expects the standard build
   * output shape, which `output: "standalone"` changes. Vercel never reads
   * `.next/standalone` at all (it has no `Dockerfile` step to copy it
   * into), so disabling standalone output specifically when `VERCEL` is
   * set costs Vercel nothing and fixes the crash; every other environment
   * (local `next build`, the Fly.io `Dockerfile` build, which does not set
   * `VERCEL`) is completely unaffected and still gets the real
   * `.next/standalone` directory the `Dockerfile` copies from.
   */
  output: process.env.VERCEL ? undefined : "standalone",

  /**
   * PR-097.05 (Security) — baseline security response headers, applied to
   * every route (`/:path*`) since Next.js's own `headers()` runs through
   * the real, full server (this app never uses `output: "export"`), not
   * something a static/edge deployment mode would bypass.
   *
   * Confirmed safe against this app's real, current surface before adding:
   * no `dangerouslySetInnerHTML`, no inline `<script>`/`next/script`, no
   * `iframe` embedding of this app by itself or anyone else, and no
   * camera/microphone/geolocation API usage anywhere in the codebase
   * (`grep` confirmed all three empty) — so none of the headers below
   * restrict anything this app actually does today.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops this app's own pages from being framed by another origin
          // (clickjacking) — this app never frames itself, and nothing
          // depends on being embeddable elsewhere.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser from MIME-sniffing a response into a
          // different content type than the server declared.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full URL as a referrer only on same-origin
          // navigation; cross-origin gets origin-only, and downgrades
          // (https→http) get nothing — real user URLs (wallet addresses
          // can appear in some query contexts) never leak to a third-party
          // Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app uses none of these browser capabilities anywhere
          // (confirmed above) — explicitly denying them closes off a real
          // class of third-party-script abuse if one were ever compromised.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // `fly.toml`'s `force_https = true` redirects HTTP→HTTPS at the
          // proxy but does not itself add this response header — HSTS is
          // what tells the browser to skip the plaintext request entirely
          // on every subsequent visit, closing the one-request window a
          // redirect-only setup still leaves open.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

/**
 * PR-097.05 (Security) — the CSP this phase's earlier pass deferred,
 * completed by tracing this app's ACTUAL current runtime network/resource
 * behavior rather than generic wallet-provider knowledge, per
 * `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
 * (Next.js's own CSP guide, consulted per this repo's `AGENTS.md`):
 *
 * - No nonce-based strict policy: Next's own docs state nonces require
 *   **every page to be dynamically rendered** (static optimization/ISR
 *   disabled). This app's marketing pages (`/`, `/about`, `/contact`,
 *   `/legal/*`) are real, intentionally static routes — confirmed in the
 *   production build output (`○ (Static)`) — and PR-097.02's own bundle
 *   work already measured and relied on that. Forcing them dynamic to
 *   support nonces would be exactly the kind of change to another PR's
 *   already-verified work this phase is told not to make. Next's own
 *   documented non-nonce alternative (`script-src 'self' 'unsafe-inline'`)
 *   is used instead — confirmed via `next.config.js` example in that same
 *   guide's "Without Nonces" section.
 * - `'unsafe-eval'` in `script-src` is added ONLY outside production,
 *   exactly matching that guide's own documented reason: "React uses
 *   `eval` to provide enhanced debugging information... not required for
 *   production."
 * - Real, traced `connect-src` origins — none guessed:
 *   - `https://mainnet.base.org`, `https://sepolia.base.org`,
 *     `https://ethereum.reth.rs` — confirmed by reading the exact chain
 *     definitions `viem/chains` ships in this app's installed version
 *     (`node_modules/viem/chains/definitions/{base,baseSepolia,mainnet}.ts`)
 *     for the three chains `lib/wallet/config.ts`'s `transports` actually
 *     configures — `wagmi`'s `http()` transport calls these directly from
 *     the browser with no explicit URL override.
 *   - `https://rpc.wallet.coinbase.com`, `https://www.walletlink.org`,
 *     `wss://www.walletlink.org` — confirmed by reading
 *     `@coinbase/wallet-sdk`'s own installed source
 *     (`node_modules/@coinbase/wallet-sdk/dist/core/constants.js` and its
 *     real `fetch()`/`WebSocket` call sites) — the RPC-proxy endpoint the
 *     connector's provider actually calls, and the legacy WalletLink
 *     relay fallback's real HTTP + WebSocket endpoints.
 *   - `https://keys.coinbase.com` — Coinbase Wallet SDK's real Smart
 *     Wallet popup origin (`CB_KEYS_URL`), needed because the popup
 *     window itself still posts/receives `window.postMessage` traffic
 *     that `connect-src` does not gate, but the SDK's own
 *     `checkCrossOriginOpenerPolicy` helper does issue a real `fetch()`
 *     against it first — confirmed in the same source tree.
 * - `frame-src 'none'`: confirmed via `grep` that neither this app nor
 *   `@coinbase/wallet-sdk` creates any `<iframe>` anywhere — Coinbase's
 *   flow is a real popup window (`window.open`, `core/communicator/
 *   Communicator.js`), which `frame-src` does not govern at all.
 * - The four injected connectors (MetaMask, Rabby, Trust Wallet via
 *   `injected({ target })`, and Coinbase's own extension detection) need
 *   NO `connect-src` entries: an injected `window.ethereum` provider's
 *   actual network calls happen inside the extension's own privileged
 *   background context, which this page's CSP cannot and does not govern.
 * - `font-src 'self'`: this app self-hosts its two fonts via
 *   `next/font/google` (`app/layout.tsx`) — no Google Fonts network
 *   request happens at runtime, so no `fonts.googleapis.com`/
 *   `fonts.gstatic.com` entry is needed.
 * - `img-src 'self' data: https:` — deliberately NOT a finite domain list.
 *   A static grep for a literal `src="http…"` found nothing because every
 *   project/token logo this app renders is a real, dynamically
 *   provider-supplied URL, not a string literal — confirmed two ways:
 *   (1) `lib/projects/build.ts`'s `resolveLogoUrl()` is PR-072's own
 *   documented 4-source priority chain (registry → CoinGecko's
 *   `market.imageUrl` → DefiLlama's `tvl.imageUrl` → GitHub's
 *   `avatarUrl`), each a live provider response field, not a fixed
 *   catalog; (2) live-verified in the real running app (`read_console_
 *   messages` against `/dashboard`), which showed real, blocked image
 *   loads from `coin-images.coingecko.com` (`lib/branding/
 *   tokenRegistry.ts`'s own curated logos, and CoinGecko's live API) AND
 *   `icons.llamao.fi` (DefiLlama's own icon CDN, via `lib/providers/
 *   defillama/mapper.ts`'s `logoUrl: raw.logo`) — two domains from two
 *   independent providers on ONE page alone. This app is a Discovery
 *   Platform (PR-094): new projects, each with their own provider-hosted
 *   logo URL, are added continuously — there is no fixed, enumerable set
 *   of image origins to allowlist without this list going stale the next
 *   time a newly discovered project's token happens to be hosted
 *   somewhere new. Restricting to `https:` still blocks plaintext `http:`
 *   image loads and any non-http(s) scheme — a real, meaningful
 *   restriction — without breaking this app's core, load-bearing branding
 *   system, which `'self' data:` alone was confirmed live to break.
 *
 * **WalletConnect is the one deliberate, documented gap.** It is NOT
 * currently active anywhere in this app's real configuration —
 * `lib/wallet/config.ts` only includes the `walletConnect()` connector
 * when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set, and it is unset in
 * `.env.example`, `.env.local`, and `fly.toml` alike (confirmed by direct
 * inspection of all three). Its real relay/verify-API domains were
 * deliberately NOT added here — enumerating them safely needs a real
 * project id and live network tracing (the exact "do not invent domains
 * from assumptions" this phase is told to avoid), which this environment
 * does not have. The `console.warn` below turns "silently enable it and
 * have it fail under CSP" into a loud, actionable build-time warning
 * instead — this app's own answer to that residual gap.
 */
const isProductionBuild = process.env.NODE_ENV === "production";

const CHAIN_RPC_CONNECT_SRC = ["https://mainnet.base.org", "https://sepolia.base.org", "https://ethereum.reth.rs"];
const COINBASE_WALLET_SDK_CONNECT_SRC = ["https://keys.coinbase.com", "https://rpc.wallet.coinbase.com", "https://www.walletlink.org", "wss://www.walletlink.org"];

const contentSecurityPolicy = [
  `default-src 'self'`,
  // Next's own documented non-nonce policy (see doc comment above) — this
  // app has no external script tags of any kind (confirmed `grep`), so
  // no third-party script domain is added.
  `script-src 'self' 'unsafe-inline'${isProductionBuild ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https:`,
  `font-src 'self'`,
  `connect-src 'self' ${[...CHAIN_RPC_CONNECT_SRC, ...COINBASE_WALLET_SDK_CONNECT_SRC].join(" ")}`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

if (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn(
    "[PR-097.05] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set, but the Content-Security-Policy in next.config.ts has " +
      "no entries for WalletConnect's relay/verify-API domains — see that file's own doc comment. The WalletConnect " +
      "connector will likely fail to connect under this CSP until real domains are traced live and added."
  );
}

export default nextConfig;
