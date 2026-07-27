import { describe, expect, it } from "vitest";

import { PROJECTS } from "@/data/projects";
import { formatValidationReport, validateRegistry } from "@/data/projects/validation";
import type { Project } from "@/data/projects/types";

/**
 * PR-051 final polish — the registry's own regression gate. `npm run
 * registry:validate` runs this file directly; it also runs as part of
 * `npm test`/CI like every other test, so a bad seed-file edit fails the
 * same way a broken component would.
 */
describe("validateRegistry — real registry", () => {
  it("has zero errors on the current seed data", () => {
    const report = validateRegistry(PROJECTS);
    if (!report.valid) {
      // Printed on failure only — a clean run stays quiet, a broken one
      // explains exactly what to fix without needing to re-run a separate tool.
      console.error(formatValidationReport(report));
    }
    expect(report.errors).toEqual([]);
  });

  it("prints the full report for visibility (`npm run registry:validate`)", () => {
    const report = validateRegistry(PROJECTS);
    console.log(formatValidationReport(report));
    expect(report.issues.length).toBeGreaterThanOrEqual(0);
  });
});

function baseProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test-project",
    slug: "test-project",
    name: "Test Project",
    shortDescription: "A test project.",
    description: "A longer description of a test project.",
    websiteUrl: "https://example.com",
    categories: ["dex"],
    tags: [],
    status: "live",
    chains: ["base"],
    contracts: [],
    social: {},
    verification: { status: "verified" },
    providerIds: {},
    ...overrides,
  };
}

describe("validateRegistry — synthetic fixtures", () => {
  it("flags duplicate ids", () => {
    const a = baseProject({ id: "dup", slug: "dup" });
    const b = baseProject({ id: "dup", slug: "dup-2" });
    const report = validateRegistry([a, b]);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === "duplicate-id")).toBe(true);
  });

  it("flags duplicate coingeckoId across two different projects", () => {
    const a = baseProject({ id: "a", slug: "a", providerIds: { coingeckoId: "shared-coin" } });
    const b = baseProject({ id: "b", slug: "b", providerIds: { coingeckoId: "shared-coin" } });
    const report = validateRegistry([a, b]);
    expect(report.errors.some((e) => e.code === "duplicate-coingecko-id")).toBe(true);
  });

  it("flags duplicate contract addresses across two different projects", () => {
    const address = "0x1111111111111111111111111111111111111111";
    const a = baseProject({ id: "a", slug: "a", contracts: [{ chain: "base", address, type: "token" }] });
    const b = baseProject({ id: "b", slug: "b", contracts: [{ chain: "base", address, type: "token" }] });
    const report = validateRegistry([a, b]);
    expect(report.errors.some((e) => e.code === "duplicate-contract-address")).toBe(true);
    expect(report.errors.some((e) => e.code === "duplicate-token-address")).toBe(true);
  });

  it("flags a malformed contract address", () => {
    const project = baseProject({ contracts: [{ chain: "base", address: "not-an-address", type: "token" }] });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "invalid-contract-address-format")).toBe(true);
  });

  it("flags a contract on a chain the project doesn't declare", () => {
    const project = baseProject({
      chains: ["base"],
      contracts: [{ chain: "ethereum", address: "0x1111111111111111111111111111111111111111", type: "token" }],
    });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "contract-chain-not-in-project-chains")).toBe(true);
  });

  it("flags an org-only GitHub url mismatch", () => {
    const project = baseProject({ github: { owner: "some-org", url: "https://github.com/wrong-owner" } });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "invalid-github-url")).toBe(true);
  });

  it("flags a governance space set without a governance type", () => {
    const project = baseProject({ governance: { snapshotSpace: "test.eth" } });
    const report = validateRegistry([project]);
    expect(report.warnings.some((w) => w.code === "governance-space-without-type")).toBe(true);
  });

  it("flags governanceType 'snapshot' with no space configured", () => {
    const project = baseProject({ governance: { governanceType: "snapshot" } });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "governance-type-without-space")).toBe(true);
  });

  it("flags an invalid website URL", () => {
    const project = baseProject({ websiteUrl: "not a url" });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "invalid-url")).toBe(true);
  });

  it("flags empty categories and empty chains", () => {
    const project = baseProject({ categories: [], chains: [] });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "empty-categories")).toBe(true);
    expect(report.errors.some((e) => e.code === "empty-chains")).toBe(true);
  });

  it("flags a dexscreenerChainId with no pair addresses or token contract to act on", () => {
    const project = baseProject({ providerIds: { dexscreenerChainId: "base" } });
    const report = validateRegistry([project]);
    expect(report.warnings.some((w) => w.code === "dexscreener-chain-id-without-target")).toBe(true);
  });

  it("flags a blockscoutAddress that doesn't match any registered contract", () => {
    const project = baseProject({ providerIds: { blockscoutAddress: "0x2222222222222222222222222222222222222222" } });
    const report = validateRegistry([project]);
    expect(report.warnings.some((w) => w.code === "blockscout-address-not-in-contracts")).toBe(true);
  });

  it("flags lifecycle 'duplicate' with no duplicateOf target", () => {
    const project = baseProject({ lifecycle: { state: "duplicate" } });
    const report = validateRegistry([project]);
    expect(report.errors.some((e) => e.code === "lifecycle-duplicate-missing-target")).toBe(true);
  });

  it("passes a fully valid project with zero issues", () => {
    const project = baseProject({
      github: { owner: "example-org", repo: "example-repo", url: "https://github.com/example-org/example-repo" },
      providerIds: { coingeckoId: "example", defillamaSlug: "example" },
    });
    const report = validateRegistry([project]);
    expect(report.valid).toBe(true);
  });
});
