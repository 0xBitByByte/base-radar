import type { Project } from "@/data/projects/types";

/**
 * Registry Coverage Report (PR-051 final polish).
 *
 * Answers, per project and provider, "how much of this project's real,
 * free-provider data is actually reachable today?" — the same question
 * docs/PROVIDER_DATA_COVERAGE_AUDIT.md and
 * docs/PR-051_REGISTRY_COMPLETION_REPORT.md answered by hand, now
 * reproducible on demand as registry data changes. Every dimension below
 * mirrors the exact matching logic `lib/intelligence/sources.ts` uses
 * (`matchGithub`, `matchTrading`, `matchVerifiedContract`, etc.) — this
 * module never invents a looser or stricter definition of "configured"
 * than what the Provider Layer itself actually checks.
 */

export type CoverageDimension =
  | "github"
  | "coingecko"
  | "defillama"
  | "dexscreener"
  | "snapshot"
  | "contracts"
  | "tokenAddress"
  | "blockscout";

export const COVERAGE_DIMENSIONS: CoverageDimension[] = [
  "github",
  "coingecko",
  "defillama",
  "dexscreener",
  "snapshot",
  "contracts",
  "tokenAddress",
  "blockscout",
];

export type ProjectCoverage = {
  id: string;
  slug: string;
  name: string;
  dimensions: Record<CoverageDimension, boolean>;
  /** Count of true dimensions out of `COVERAGE_DIMENSIONS.length`, as a rounded percentage. */
  coveragePct: number;
};

export type RegistryCoverageReport = {
  projects: ProjectCoverage[];
  totalProjects: number;
  averageCoveragePct: number;
  highest: ProjectCoverage;
  lowest: ProjectCoverage;
  /** Percentage of all projects where each dimension is configured. */
  dimensionAvailabilityPct: Record<CoverageDimension, number>;
};

/** Real GitHub coverage means `matchGithub` (`lib/intelligence/sources.ts`) can actually resolve a repo — an org-only reference (no `repo`) resolves to nothing, per that function's own rule. */
function hasGithub(project: Project): boolean {
  return Boolean(project.github?.repo);
}

function hasCoinGecko(project: Project): boolean {
  return Boolean(project.providerIds.coingeckoId);
}

function hasDefiLlama(project: Project): boolean {
  return Boolean(project.providerIds.defillamaSlug);
}

/** Mirrors `matchTrading`'s two real paths: a registered Base token contract (the PR-051 direct-lookup path) or legacy `dexscreenerPairAddresses`. */
function hasDexScreener(project: Project): boolean {
  const hasTokenContract = project.contracts.some((c) => c.chain === "base" && c.type === "token");
  const hasPairAddresses = Boolean(project.providerIds.dexscreenerPairAddresses?.length);
  return hasTokenContract || hasPairAddresses;
}

function hasSnapshot(project: Project): boolean {
  return Boolean(project.governance?.snapshotSpace);
}

function hasContracts(project: Project): boolean {
  return project.contracts.length > 0;
}

function hasTokenAddress(project: Project): boolean {
  return project.contracts.some((c) => c.type === "token");
}

/** Mirrors the PR-051-widened `matchVerifiedContract`: an explicit `blockscoutAddress`, or any registered Base-chain contract, gives the bulk "most-recently-verified" match a real (if coincidental) chance to fire. */
function hasBlockscout(project: Project): boolean {
  return Boolean(project.providerIds.blockscoutAddress) || project.contracts.some((c) => c.chain === "base");
}

export function computeProjectCoverage(project: Project): ProjectCoverage {
  const dimensions: Record<CoverageDimension, boolean> = {
    github: hasGithub(project),
    coingecko: hasCoinGecko(project),
    defillama: hasDefiLlama(project),
    dexscreener: hasDexScreener(project),
    snapshot: hasSnapshot(project),
    contracts: hasContracts(project),
    tokenAddress: hasTokenAddress(project),
    blockscout: hasBlockscout(project),
  };

  const trueCount = COVERAGE_DIMENSIONS.filter((d) => dimensions[d]).length;
  const coveragePct = Math.round((trueCount / COVERAGE_DIMENSIONS.length) * 100);

  return { id: project.id, slug: project.slug, name: project.name, dimensions, coveragePct };
}

export function computeRegistryCoverage(projects: Project[]): RegistryCoverageReport {
  const coverages = projects.map(computeProjectCoverage);

  const averageCoveragePct =
    coverages.length === 0 ? 0 : Math.round(coverages.reduce((sum, c) => sum + c.coveragePct, 0) / coverages.length);

  const highest = coverages.reduce((best, c) => (c.coveragePct > best.coveragePct ? c : best), coverages[0]);
  const lowest = coverages.reduce((worst, c) => (c.coveragePct < worst.coveragePct ? c : worst), coverages[0]);

  const dimensionAvailabilityPct = Object.fromEntries(
    COVERAGE_DIMENSIONS.map((dimension) => {
      const count = coverages.filter((c) => c.dimensions[dimension]).length;
      const pct = coverages.length === 0 ? 0 : Math.round((count / coverages.length) * 100);
      return [dimension, pct];
    })
  ) as Record<CoverageDimension, number>;

  return {
    projects: coverages,
    totalProjects: coverages.length,
    averageCoveragePct,
    highest,
    lowest,
    dimensionAvailabilityPct,
  };
}

const DIMENSION_LABEL: Record<CoverageDimension, string> = {
  github: "GitHub",
  coingecko: "CoinGecko",
  defillama: "DefiLlama",
  dexscreener: "DexScreener",
  snapshot: "Snapshot",
  contracts: "Contracts",
  tokenAddress: "Token Address",
  blockscout: "Blockscout",
};

/** Human-readable per-project coverage listing plus overall statistics. */
export function formatCoverageReport(report: RegistryCoverageReport): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("Registry Coverage Report");
  lines.push("=".repeat(60));

  const sorted = [...report.projects].sort((a, b) => b.coveragePct - a.coveragePct);
  for (const project of sorted) {
    const configured = COVERAGE_DIMENSIONS.filter((d) => project.dimensions[d]).map((d) => DIMENSION_LABEL[d]);
    lines.push("");
    lines.push(`${project.name} (${project.slug})`);
    lines.push(`  Coverage: ${project.coveragePct}%`);
    lines.push(`  Configured: ${configured.length > 0 ? configured.join(", ") : "none"}`);
  }

  lines.push("");
  lines.push("-".repeat(60));
  lines.push("Overall Statistics");
  lines.push("-".repeat(60));
  lines.push(`Total projects: ${report.totalProjects}`);
  lines.push(`Average coverage: ${report.averageCoveragePct}%`);
  lines.push(`Highest coverage: ${report.highest.name} (${report.highest.coveragePct}%)`);
  lines.push(`Lowest coverage: ${report.lowest.name} (${report.lowest.coveragePct}%)`);
  lines.push("=".repeat(60));
  return lines.join("\n");
}

export type ProviderCoverageSummary = {
  dimension: CoverageDimension;
  label: string;
  configuredCount: number;
  missingCount: number;
  coveragePct: number;
};

/** Provider-centric view of the same coverage data — one row per provider instead of one per project. */
export function computeProviderCoverage(report: RegistryCoverageReport): ProviderCoverageSummary[] {
  return COVERAGE_DIMENSIONS.map((dimension) => {
    const configuredCount = report.projects.filter((p) => p.dimensions[dimension]).length;
    return {
      dimension,
      label: DIMENSION_LABEL[dimension],
      configuredCount,
      missingCount: report.totalProjects - configuredCount,
      coveragePct: report.dimensionAvailabilityPct[dimension],
    };
  });
}

/** Human-readable provider-by-provider breakdown, plus Base RPC (always 100% today — every seed project deploys on Base, and `matchNetwork` only checks `chains.includes("base")`, never a per-project identifier). */
export function formatProviderCoverageReport(report: RegistryCoverageReport, projects: Project[]): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("Provider Coverage Summary");
  lines.push("=".repeat(60));

  for (const summary of computeProviderCoverage(report)) {
    lines.push("");
    lines.push(summary.label);
    lines.push(`  Configured: ${summary.configuredCount} / ${report.totalProjects}`);
    lines.push(`  Missing: ${summary.missingCount} / ${report.totalProjects}`);
    lines.push(`  Coverage: ${summary.coveragePct}%`);
  }

  const baseRpcCount = projects.filter((p) => p.chains.includes("base")).length;
  lines.push("");
  lines.push("Base RPC");
  lines.push(`  Configured: ${baseRpcCount} / ${projects.length}`);
  lines.push(`  Missing: ${projects.length - baseRpcCount} / ${projects.length}`);
  lines.push(`  Coverage: ${projects.length === 0 ? 0 : Math.round((baseRpcCount / projects.length) * 100)}%`);
  lines.push("  (matchNetwork only requires \"base\" in `chains` — no separate identifier field exists.)");

  lines.push("");
  lines.push("=".repeat(60));
  return lines.join("\n");
}
