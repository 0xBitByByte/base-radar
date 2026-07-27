import { describe, expect, it } from "vitest";

import { PROJECTS } from "@/data/projects";
import {
  computeProjectCoverage,
  computeProviderCoverage,
  computeRegistryCoverage,
  formatCoverageReport,
  formatProviderCoverageReport,
} from "@/data/projects/coverage";
import type { Project } from "@/data/projects/types";

/** PR-051 final polish — `npm run registry:coverage` runs this file directly to print both reports. */
describe("Registry coverage — real registry", () => {
  it("computes coverage for every project and prints the reports", () => {
    const report = computeRegistryCoverage(PROJECTS);
    console.log(formatCoverageReport(report));
    console.log(formatProviderCoverageReport(report, PROJECTS));

    expect(report.projects).toHaveLength(PROJECTS.length);
    for (const project of report.projects) {
      expect(project.coveragePct).toBeGreaterThanOrEqual(0);
      expect(project.coveragePct).toBeLessThanOrEqual(100);
    }
    expect(report.averageCoveragePct).toBeGreaterThanOrEqual(0);
    expect(report.averageCoveragePct).toBeLessThanOrEqual(100);
  });

  it("Base RPC coverage is 100% — every seed project deploys on Base", () => {
    const onBase = PROJECTS.filter((p) => p.chains.includes("base"));
    expect(onBase).toHaveLength(PROJECTS.length);
  });
});

function project(overrides: Partial<Project>): Project {
  return {
    id: "p",
    slug: "p",
    name: "P",
    shortDescription: "",
    description: "",
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

describe("computeProjectCoverage", () => {
  it("reports 0% for a fully empty project", () => {
    const coverage = computeProjectCoverage(project({}));
    expect(coverage.coveragePct).toBe(0);
    expect(Object.values(coverage.dimensions).every((v) => v === false)).toBe(true);
  });

  it("reports 100% when every dimension is configured", () => {
    const coverage = computeProjectCoverage(
      project({
        github: { owner: "o", repo: "r", url: "https://github.com/o/r" },
        providerIds: { coingeckoId: "x", defillamaSlug: "x" },
        governance: { snapshotSpace: "x.eth", governanceType: "snapshot" },
        contracts: [{ chain: "base", address: "0x1111111111111111111111111111111111111111", type: "token" }],
      })
    );
    expect(coverage.coveragePct).toBe(100);
  });

  it("treats an org-only GitHub reference (no repo) as not covered", () => {
    const coverage = computeProjectCoverage(project({ github: { owner: "o", url: "https://github.com/o" } }));
    expect(coverage.dimensions.github).toBe(false);
  });

  it("treats a registered Base token contract as DexScreener coverage, mirroring matchTrading", () => {
    const coverage = computeProjectCoverage(
      project({ contracts: [{ chain: "base", address: "0x1111111111111111111111111111111111111111", type: "token" }] })
    );
    expect(coverage.dimensions.dexscreener).toBe(true);
    expect(coverage.dimensions.tokenAddress).toBe(true);
    expect(coverage.dimensions.contracts).toBe(true);
    expect(coverage.dimensions.blockscout).toBe(true);
  });
});

describe("computeProviderCoverage", () => {
  it("sums to the total project count for each dimension", () => {
    const report = computeRegistryCoverage(PROJECTS);
    for (const summary of computeProviderCoverage(report)) {
      expect(summary.configuredCount + summary.missingCount).toBe(PROJECTS.length);
    }
  });
});
