import type { Project } from "@/data/projects/types";

/**
 * PR-098.01 — Featured Ecosystem Provider Mapping Audit. Previously present
 * only in `components/landing/featuredProjects.ts`'s illustrative fixture,
 * with zero registry entry and zero real provider mapping (the landing
 * fixture's own `logoUrl` doc comment listed it among projects with "no
 * real coingeckoId ... on file"). This entry corrects that: every field
 * below was confirmed live against the provider's own API immediately
 * before writing this file, not guessed from the landing fixture's
 * (inaccurate) "Perpetuals and yield trading protocol" description — Hydrex
 * is actually a ve(3,3) MetaDEX/AMM, the same category of protocol as
 * Aerodrome, confirmed via CoinGecko's own coin data, DexScreener's live
 * pair data (real "hydrex" dexId), and DefiLlama's protocol page.
 */
export const hydrex: Project = {
  id: "hydrex",
  slug: "hydrex",
  name: "Hydrex",
  shortDescription: "Liquidity-neutral ve(3,3) MetaDEX purpose-built for Base.",
  description:
    "Hydrex is a liquidity-neutral ve(3,3) protocol built on Base for Base, pipelining users directly into its own AMM/gauge flywheel rather than being a perpetuals venue.",
  websiteUrl: "https://hydrex.fi",
  categories: ["dex", "yield"],
  tags: ["base-native", "real-yield"],
  status: "live",
  chains: ["base"],
  contracts: [
    {
      chain: "base",
      // Confirmed live via `api.coingecko.com/api/v3/coins/hydrex` — its own
      // `platforms.base` field, not scraped or guessed.
      address: "0x00000e7efa313f4e11bfff432471ed9423ac6b30",
      type: "token",
      label: "HYDX token (Base)",
    },
  ],
  github: {
    // Confirmed real org via direct search + repo listing (hydrex-periphery,
    // hydrex-lists). Org-level reference — no single canonical repo to pick.
    owner: "hydrexfi",
    url: "https://github.com/hydrexfi",
  },
  social: {},
  verification: {
    status: "verified",
    source: "Base Radar review (PR-098.01)",
    verifiedAt: "2026-09-16",
  },
  providerIds: {
    // Confirmed live: `api.coingecko.com/api/v3/coins/hydrex` resolves with
    // name "Hydrex" and a real Base platform address matching the contract
    // above.
    coingeckoId: "hydrex",
    dexscreenerChainId: "base",
    // Confirmed live via `api.dexscreener.com/latest/dex/tokens/{address}` —
    // HYDX's own AMM appears as real pairs under dexId "hydrex" (alongside
    // third-party Uniswap/Aerodrome pairs where HYDX is just one leg).
    dexscreenerDexIds: ["hydrex"],
    dexscreenerPairAddresses: ["0x51f0b932855986b0e621c9d4db6eee1f4644d3d2"],
    // Confirmed live via `api.llama.fi/protocol/hydrex-omni` — the current
    // canonical DefiLlama slug (Hydrex also has older/legacy slugs —
    // `hydrex`, `hydrex-v3`, `hydrex-v4`, `hydrex-integral` — from its
    // protocol's version history; "omni" is the one returning live,
    // current, Base-only TVL data as of this review).
    defillamaSlug: "hydrex-omni",
    blockscoutAddress: "0x00000e7efa313f4e11bfff432471ed9423ac6b30",
  },
  governance: {
    // Confirmed live via a direct `hub.snapshot.org/graphql` query: a real
    // space named "Hydrex", network id "8453" (Base), with a real closed
    // proposal ("Hydrex Emissions Optimization") — not a guess from the
    // `governance.hydrex.fi` custom portal, which does not itself confirm
    // Snapshot usage.
    snapshotSpace: "hydrex.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:hydrex.eth",
  },
};
