import type { Project } from "@/data/projects/types";

/**
 * PR-098.01 — Featured Ecosystem Provider Mapping Audit. The landing
 * fixture's own description ("Sky (formerly MakerDAO) lending and savings
 * protocol extending onto Base") was accurate — but the naive `coingeckoId:
 * "spark"` a first-pass web search suggested was WRONG: that id resolves
 * to a real API 404 (`{"error":"coin not found"}` from
 * `api.coingecko.com/api/v3/coins/spark`, confirmed live). The real id,
 * `spark-2`, was found via CoinGecko's own `/search?query=spark` endpoint
 * and confirmed by its `name: "Spark"`, `symbol: "SPK"`, and real market
 * cap rank. Every field below was confirmed live immediately before
 * writing this file.
 */
export const spark: Project = {
  id: "spark",
  slug: "spark",
  name: "Spark",
  shortDescription: "Sky (formerly MakerDAO) onchain capital allocator extending onto Base.",
  description:
    "Spark is Sky's onchain capital allocator, combining SparkLend, Spark Savings, and the Spark Liquidity Layer to deploy capital across DeFi, CeFi, and RWA markets, with an active Base deployment.",
  websiteUrl: "https://spark.finance",
  categories: ["lending"],
  tags: ["cross-chain", "real-yield"],
  status: "live",
  chains: ["base", "ethereum"],
  contracts: [
    {
      chain: "base",
      // Confirmed via Sky/Spark's own official GitHub address registry
      // (`github.com/sparkdotfi/spark-address-registry`, `src/Base.sol`,
      // `SUSDC` constant) — SPK's Ethereum-only CoinGecko listing has no
      // Base platform entry, so this Base-specific vault token (not SPK
      // itself) is the real, addressable Base contract for this project.
      address: "0x3128a0f7f0ea68e7b7c9b00afa7e41045828e858",
      type: "token",
      label: "Spark USDC Vault (sUSDC, Base)",
    },
  ],
  github: {
    // Confirmed real org (also aliased as "marsfoundation"); "sparkdotfi" is
    // the current canonical name. Org-level reference — 49+ repos, no
    // single canonical one to pick.
    owner: "sparkdotfi",
    url: "https://github.com/sparkdotfi",
  },
  social: {},
  verification: {
    status: "verified",
    source: "Base Radar review (PR-098.01)",
    verifiedAt: "2026-09-16",
  },
  providerIds: {
    // Confirmed live via `api.coingecko.com/api/v3/coins/spark-2` — name
    // "Spark", homepage "https://spark.finance/", SPK token. NOT "spark"
    // (that id doesn't exist) or "spark-4"/"spark-5" (unrelated coins that
    // happen to share the name).
    coingeckoId: "spark-2",
    // Confirmed live via `api.llama.fi/protocol/spark-liquidity-layer` —
    // real protocol, chains include Base. Spark's DefiLlama presence is
    // split across several sub-protocol slugs (SparkLend is Ethereum/Gnosis
    // only); this is the one that actually covers the Base deployment.
    defillamaSlug: "spark-liquidity-layer",
    blockscoutAddress: "0x3128a0f7f0ea68e7b7c9b00afa7e41045828e858",
  },
  governance: {
    // Confirmed live via a direct `hub.snapshot.org/graphql` query: a real
    // space named "Spark" ("Onchain Capital Allocator"), with real recent
    // proposals (e.g. "SAEP-22: Update Risk Curation Framework").
    snapshotSpace: "sparkfi.eth",
    governanceType: "snapshot",
    governanceUrl: "https://snapshot.box/#/s:sparkfi.eth",
  },
};
