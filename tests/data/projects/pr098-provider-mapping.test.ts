import { describe, expect, it } from "vitest";

import { getProject } from "@/data/projects";
import { FEATURED_PROJECT_IDS } from "@/components/landing/featuredProjects";

/**
 * PR-098.01 — Featured Ecosystem Provider Mapping Audit & Remediation.
 * Regression guard for the three real mappings this audit added to the
 * canonical registry (`data/projects/seed/{hydrex,spark,oku}.ts`), each
 * confirmed live against the provider's own API before being written —
 * see those files' doc comments for the exact verification evidence.
 *
 * Superchain Eco and Based Agents were deliberately NOT mapped: PR-098.01
 * found Superchain Eco is a third-party ecosystem directory site (not a
 * project with its own token/TVL) and found no evidence Based Agents
 * exists as a distinct real protocol — both remain unmapped, on purpose,
 * per the "never invent a mapping" rule. PR-100 independently re-verified
 * both identities (superchain.eco confirmed as an OP Superchain directory
 * site with 500+ third-party listings and no token/TVL/contracts/
 * governance of its own; "Based Agents" traced to no canonical protocol —
 * the only real entity near that name is `murrlincoln/Based-Agent`, an
 * individual's open-source AI-agent template, not an organization or
 * protocol) and, on that evidence, removed both from Featured Ecosystem
 * entirely (`components/landing/featuredProjects.ts`) rather than leaving
 * them as permanently-unavailable members. See the PR-098.01 and PR-100
 * reports for the full findings.
 */
describe("PR-098.01 — Hydrex registry mapping", () => {
  const hydrex = getProject("hydrex");

  it("exists in the registry", () => {
    expect(hydrex).toBeDefined();
  });

  it("has a verified CoinGecko id, DexScreener dexId, and DefiLlama slug", () => {
    expect(hydrex?.providerIds.coingeckoId).toBe("hydrex");
    expect(hydrex?.providerIds.dexscreenerDexIds).toContain("hydrex");
    expect(hydrex?.providerIds.defillamaSlug).toBe("hydrex-omni");
  });

  it("has a Base token contract matching its CoinGecko-confirmed platform address", () => {
    expect(hydrex?.contracts.some((c) => c.chain === "base" && c.address === "0x00000e7efa313f4e11bfff432471ed9423ac6b30")).toBe(true);
  });

  it("has a real Snapshot governance space (not guessed)", () => {
    expect(hydrex?.governance?.snapshotSpace).toBe("hydrex.eth");
    expect(hydrex?.governance?.governanceType).toBe("snapshot");
  });
});

describe("PR-098.01 — Spark registry mapping", () => {
  const spark = getProject("spark");

  it("exists in the registry", () => {
    expect(spark).toBeDefined();
  });

  it("uses the corrected CoinGecko id (\"spark-2\", not the naive \"spark\" guess)", () => {
    expect(spark?.providerIds.coingeckoId).toBe("spark-2");
  });

  it("has a Base-inclusive DefiLlama slug and a real Snapshot space", () => {
    expect(spark?.providerIds.defillamaSlug).toBe("spark-liquidity-layer");
    expect(spark?.governance?.snapshotSpace).toBe("sparkfi.eth");
  });
});

describe("PR-098.01 — Oku registry mapping (partial coverage, by design)", () => {
  const oku = getProject("oku");

  it("exists in the registry with a real GitHub mapping", () => {
    expect(oku).toBeDefined();
    expect(oku?.github?.owner).toBe("oku-trade");
  });

  it("has no invented market/TVL provider ids — Oku genuinely has no token", () => {
    expect(oku?.providerIds.coingeckoId).toBeUndefined();
    expect(oku?.providerIds.defillamaSlug).toBeUndefined();
    expect(oku?.providerIds.blockscoutAddress).toBeUndefined();
  });
});

describe("PR-101 — Oku classification & intelligence corrections", () => {
  const oku = getProject("oku");

  it("is categorized as infrastructure, not dex — Oku is an interface over Uniswap v3/Morpho, it doesn't operate a DEX or own liquidity", () => {
    expect(oku?.categories).toEqual(["infrastructure"]);
    expect(oku?.categories).not.toContain("dex");
  });

  it("still has no invented token/TVL/contract provider ids after re-verification — no fabricated mapping introduced", () => {
    expect(oku?.providerIds.coingeckoId).toBeUndefined();
    expect(oku?.providerIds.defillamaSlug).toBeUndefined();
    expect(oku?.providerIds.blockscoutAddress).toBeUndefined();
    expect(oku?.contracts).toEqual([]);
    expect(oku?.governance).toBeUndefined();
  });

  it("pins a real, specific, most-recently-active GitHub repo — was org-only, so Developer Activity was always N/A before this fix", () => {
    expect(oku?.github?.repo).toBe("oku-router");
    expect(oku?.github?.url).toBe("https://github.com/oku-trade/oku-router");
  });
});

describe("PR-098.01 — genuinely unavailable projects stay unmapped", () => {
  it("Superchain Eco and Based Agents have no registry entry (no legitimate mapping found)", () => {
    expect(getProject("superchain-eco")).toBeUndefined();
    expect(getProject("based-agents")).toBeUndefined();
  });
});

describe("PR-100 — Superchain Eco and Based Agents removed from Featured Ecosystem", () => {
  it("neither id has a registry entry, and neither is in the Featured Ecosystem list — no fabricated mapping, no orphaned membership", () => {
    expect(getProject("superchain-eco")).toBeUndefined();
    expect(getProject("based-agents")).toBeUndefined();
    expect(FEATURED_PROJECT_IDS).not.toContain("superchain-eco");
    expect(FEATURED_PROJECT_IDS).not.toContain("based-agents");
  });
});
