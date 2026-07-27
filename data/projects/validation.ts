import { CHAINS, CONTRACT_TYPES } from "@/data/projects/enums";
import type { Project, ProjectContract } from "@/data/projects/types";

/**
 * Registry Validation Utility (PR-051 final polish).
 *
 * Pure, static analysis over the seed registry — no network calls, no
 * provider layer involved. Exists so a bad edit to `data/projects/seed/*`
 * (a duplicate identifier, a malformed address, a self-contradicting
 * field combination) is caught mechanically instead of silently shipping
 * and quietly breaking a provider match somewhere downstream (see
 * docs/PR-051_REGISTRY_COMPLETION_REPORT.md for a real example: Moonwell's
 * `coingeckoId` was a URL slug that could never have matched CoinGecko's
 * actual API `id`, and nothing caught it before this tool existed).
 *
 * Every check here validates the registry against its own documented
 * rules (docs/PROJECT_REGISTRY.md) or against a real external format
 * (a GitHub repo name, an EVM address, CoinGecko's own id convention) —
 * never a guess at what "good" data looks like.
 */

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  /** Stable, kebab-case identifier for this rule — stays constant even if the message wording changes. */
  code: string;
  /** The project this issue was found on, if it's project-scoped (absent for pure cross-registry checks that name multiple projects in the message itself). */
  projectId?: string;
  /** The field path this issue concerns, e.g. `"providerIds.coingeckoId"`. */
  field?: string;
  message: string;
};

export type RegistryValidationReport = {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** `true` iff `errors.length === 0`. Warnings never fail validation — they're real, worth a human glance, but not a data-integrity break. */
  valid: boolean;
};

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
/** CoinGecko/DefiLlama ids and slugs are lowercase kebab-case — no uppercase, no underscores, no leading/trailing/doubled hyphens. */
const LOWERCASE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** GitHub usernames/orgs: alphanumeric and single hyphens, no leading/trailing hyphen. */
const GITHUB_OWNER_RE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
/** GitHub repo names: alphanumeric plus `.`, `_`, `-`. */
const GITHUB_REPO_RE = /^[A-Za-z0-9._-]+$/;
/** Snapshot spaces are almost always an ENS name (`foo.eth`); a handful of legitimate spaces are a plain lowercase slug instead. Both are accepted; anything with whitespace or uppercase is not. */
const SNAPSHOT_SPACE_RE = /^[a-z0-9][a-z0-9.-]*$/;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function issue(severity: ValidationSeverity, code: string, message: string, projectId?: string, field?: string): ValidationIssue {
  return { severity, code, message, projectId, field };
}

/** Generic "which values are used by more than one project" pass — the shared engine behind every duplicate-identifier check below. */
function findDuplicates(entries: { projectId: string; value: string }[]): Map<string, string[]> {
  const byValue = new Map<string, string[]>();
  for (const { projectId, value } of entries) {
    const key = value.toLowerCase();
    const existing = byValue.get(key);
    if (existing) existing.push(projectId);
    else byValue.set(key, [projectId]);
  }
  for (const [key, ids] of byValue) {
    if (ids.length < 2) byValue.delete(key);
  }
  return byValue;
}

function checkDuplicateIdentifiers(projects: Project[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const ids = findDuplicates(projects.map((p) => ({ projectId: p.id, value: p.id })));
  for (const [value, projectIds] of ids) {
    issues.push(issue("error", "duplicate-id", `Project id "${value}" is used by ${projectIds.length} projects: ${projectIds.join(", ")}.`));
  }

  const slugs = findDuplicates(projects.map((p) => ({ projectId: p.id, value: p.slug })));
  for (const [value, projectIds] of slugs) {
    issues.push(issue("error", "duplicate-slug", `Slug "${value}" is used by ${projectIds.length} projects: ${projectIds.join(", ")}.`));
  }

  const coingeckoIds = findDuplicates(
    projects.filter((p) => p.providerIds.coingeckoId).map((p) => ({ projectId: p.id, value: p.providerIds.coingeckoId! }))
  );
  for (const [value, projectIds] of coingeckoIds) {
    issues.push(
      issue(
        "error",
        "duplicate-coingecko-id",
        `coingeckoId "${value}" is configured on ${projectIds.length} projects: ${projectIds.join(", ")} — CoinGecko market data would resolve identically for both, which is only correct if they really are the same asset.`,
        undefined,
        "providerIds.coingeckoId"
      )
    );
  }

  const defillamaSlugs = findDuplicates(
    projects.filter((p) => p.providerIds.defillamaSlug).map((p) => ({ projectId: p.id, value: p.providerIds.defillamaSlug! }))
  );
  for (const [value, projectIds] of defillamaSlugs) {
    issues.push(
      issue(
        "error",
        "duplicate-defillama-slug",
        `defillamaSlug "${value}" is configured on ${projectIds.length} projects: ${projectIds.join(", ")}.`,
        undefined,
        "providerIds.defillamaSlug"
      )
    );
  }

  const snapshotSpaces = findDuplicates(
    projects.filter((p) => p.governance?.snapshotSpace).map((p) => ({ projectId: p.id, value: p.governance!.snapshotSpace! }))
  );
  for (const [value, projectIds] of snapshotSpaces) {
    issues.push(
      issue(
        "error",
        "duplicate-snapshot-space",
        `snapshotSpace "${value}" is configured on ${projectIds.length} projects: ${projectIds.join(", ")}.`,
        undefined,
        "governance.snapshotSpace"
      )
    );
  }

  const githubRepos = findDuplicates(
    projects
      .filter((p) => p.github?.repo)
      .map((p) => ({ projectId: p.id, value: `${p.github!.owner}/${p.github!.repo}` }))
  );
  for (const [value, projectIds] of githubRepos) {
    issues.push(
      issue(
        "error",
        "duplicate-github-repo",
        `GitHub repo "${value}" is configured on ${projectIds.length} projects: ${projectIds.join(", ")}.`,
        undefined,
        "github"
      )
    );
  }

  const allContractAddresses = findDuplicates(
    projects.flatMap((p) => p.contracts.map((c) => ({ projectId: p.id, value: c.address })))
  );
  for (const [value, projectIds] of allContractAddresses) {
    issues.push(
      issue(
        "error",
        "duplicate-contract-address",
        `Contract address ${value} is registered on ${projectIds.length} projects: ${projectIds.join(", ")} — the same on-chain address almost never legitimately belongs to two different registry entries.`,
        undefined,
        "contracts"
      )
    );
  }

  const tokenAddresses = findDuplicates(
    projects.flatMap((p) => p.contracts.filter((c) => c.type === "token").map((c) => ({ projectId: p.id, value: c.address })))
  );
  for (const [value, projectIds] of tokenAddresses) {
    issues.push(
      issue(
        "error",
        "duplicate-token-address",
        `Token contract ${value} is registered as a "token" on ${projectIds.length} projects: ${projectIds.join(", ")}.`,
        undefined,
        "contracts[type=token]"
      )
    );
  }

  return issues;
}

function checkContract(projectId: string, projectChains: readonly string[], contract: ProjectContract): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!(CHAINS as readonly string[]).includes(contract.chain)) {
    issues.push(issue("error", "invalid-contract-chain", `Contract ${contract.address} has chain "${contract.chain}", not one of the registry's known chains.`, projectId, "contracts[].chain"));
  } else if (!projectChains.includes(contract.chain)) {
    issues.push(
      issue(
        "error",
        "contract-chain-not-in-project-chains",
        `Contract ${contract.address} is on chain "${contract.chain}", but this project's own \`chains\` array doesn't list "${contract.chain}" as a deployment.`,
        projectId,
        "contracts[].chain"
      )
    );
  }

  if (!(CONTRACT_TYPES as readonly string[]).includes(contract.type)) {
    issues.push(issue("error", "invalid-contract-type", `Contract ${contract.address} has type "${contract.type}", not one of the registry's known contract types.`, projectId, "contracts[].type"));
  }

  if (!ETH_ADDRESS_RE.test(contract.address)) {
    issues.push(issue("error", "invalid-contract-address-format", `Contract address "${contract.address}" is not a well-formed 0x + 40 hex character address.`, projectId, "contracts[].address"));
  }

  return issues;
}

function checkGithub(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const github = project.github;
  if (!github) return issues;

  if (!GITHUB_OWNER_RE.test(github.owner)) {
    issues.push(issue("error", "invalid-github-owner-format", `GitHub owner "${github.owner}" doesn't look like a real GitHub username/org (alphanumeric and single hyphens only).`, project.id, "github.owner"));
  }
  if (github.repo && !GITHUB_REPO_RE.test(github.repo)) {
    issues.push(issue("error", "invalid-github-repo-format", `GitHub repo "${github.repo}" doesn't look like a real GitHub repo name.`, project.id, "github.repo"));
  }

  const expectedUrl = github.repo ? `https://github.com/${github.owner}/${github.repo}` : `https://github.com/${github.owner}`;
  if (github.url !== expectedUrl) {
    issues.push(
      issue(
        "error",
        "invalid-github-url",
        `github.url ("${github.url}") doesn't match owner/repo ("${expectedUrl}") — likely a copy-paste mismatch after one of the two was edited.`,
        project.id,
        "github.url"
      )
    );
  }

  return issues;
}

function checkProviderIds(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { coingeckoId, defillamaSlug, dexscreenerChainId, dexscreenerPairAddresses, blockscoutAddress, baseRpcAddress } = project.providerIds;

  if (coingeckoId && !LOWERCASE_SLUG_RE.test(coingeckoId)) {
    issues.push(issue("warning", "invalid-coingecko-id-format", `coingeckoId "${coingeckoId}" doesn't look like CoinGecko's lowercase-kebab id convention.`, project.id, "providerIds.coingeckoId"));
  }
  if (defillamaSlug && !LOWERCASE_SLUG_RE.test(defillamaSlug)) {
    issues.push(issue("warning", "invalid-defillama-slug-format", `defillamaSlug "${defillamaSlug}" doesn't look like DefiLlama's lowercase-kebab slug convention.`, project.id, "providerIds.defillamaSlug"));
  }

  if (blockscoutAddress) {
    if (!ETH_ADDRESS_RE.test(blockscoutAddress)) {
      issues.push(issue("error", "invalid-provider-address-format", `blockscoutAddress "${blockscoutAddress}" is not a well-formed address.`, project.id, "providerIds.blockscoutAddress"));
    } else if (!project.contracts.some((c) => c.address.toLowerCase() === blockscoutAddress.toLowerCase())) {
      issues.push(
        issue(
          "warning",
          "blockscout-address-not-in-contracts",
          `blockscoutAddress ${blockscoutAddress} doesn't match any address in this project's own \`contracts\` array — worth confirming it's the address intended.`,
          project.id,
          "providerIds.blockscoutAddress"
        )
      );
    }
  }

  if (baseRpcAddress && !ETH_ADDRESS_RE.test(baseRpcAddress)) {
    issues.push(issue("error", "invalid-provider-address-format", `baseRpcAddress "${baseRpcAddress}" is not a well-formed address.`, project.id, "providerIds.baseRpcAddress"));
  }

  if (dexscreenerPairAddresses) {
    for (const address of dexscreenerPairAddresses) {
      if (!ETH_ADDRESS_RE.test(address)) {
        issues.push(issue("error", "invalid-provider-address-format", `dexscreenerPairAddresses entry "${address}" is not a well-formed address.`, project.id, "providerIds.dexscreenerPairAddresses"));
      }
    }
  }

  if (dexscreenerChainId) {
    const hasPairAddresses = Boolean(dexscreenerPairAddresses?.length);
    const hasBaseTokenContract = project.contracts.some((c) => c.chain === "base" && c.type === "token");
    if (!hasPairAddresses && !hasBaseTokenContract) {
      issues.push(
        issue(
          "warning",
          "dexscreener-chain-id-without-target",
          `dexscreenerChainId is set to "${dexscreenerChainId}", but this project has neither dexscreenerPairAddresses nor a registered Base token contract for \`matchTrading\` to look up — the field currently has nothing to act on.`,
          project.id,
          "providerIds.dexscreenerChainId"
        )
      );
    }
  }

  return issues;
}

function checkGovernance(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const governance = project.governance;
  if (!governance) return issues;

  if (governance.governanceType === "snapshot" && !governance.snapshotSpace) {
    issues.push(issue("error", "governance-type-without-space", `governanceType is "snapshot" but snapshotSpace is unset.`, project.id, "governance.snapshotSpace"));
  }
  if (governance.snapshotSpace) {
    if (!SNAPSHOT_SPACE_RE.test(governance.snapshotSpace)) {
      issues.push(issue("warning", "invalid-snapshot-space-format", `snapshotSpace "${governance.snapshotSpace}" contains characters not typical of a Snapshot space id.`, project.id, "governance.snapshotSpace"));
    }
    if (!governance.governanceType) {
      issues.push(issue("warning", "governance-space-without-type", `snapshotSpace is set but governanceType is unset — should be "snapshot".`, project.id, "governance.governanceType"));
    }
  }
  if (governance.governanceUrl && !isValidUrl(governance.governanceUrl)) {
    issues.push(issue("error", "invalid-url", `governanceUrl "${governance.governanceUrl}" is not a valid URL.`, project.id, "governance.governanceUrl"));
  }

  return issues;
}

function checkUrls(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isValidUrl(project.websiteUrl)) {
    issues.push(issue("error", "invalid-url", `websiteUrl "${project.websiteUrl}" is not a valid URL.`, project.id, "websiteUrl"));
  }
  if (project.github && !isValidUrl(project.github.url)) {
    issues.push(issue("error", "invalid-url", `github.url "${project.github.url}" is not a valid URL.`, project.id, "github.url"));
  }
  for (const [platform, value] of Object.entries(project.social)) {
    if (value && !isValidUrl(value)) {
      issues.push(issue("error", "invalid-url", `social.${platform} "${value}" is not a valid URL.`, project.id, `social.${platform}`));
    }
  }

  return issues;
}

function checkCompleteness(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!project.name.trim()) issues.push(issue("error", "empty-required-field", "name is empty.", project.id, "name"));
  if (!project.shortDescription.trim()) issues.push(issue("error", "empty-required-field", "shortDescription is empty.", project.id, "shortDescription"));
  if (!project.description.trim()) issues.push(issue("error", "empty-required-field", "description is empty.", project.id, "description"));
  if (project.categories.length === 0) issues.push(issue("error", "empty-categories", "categories is empty — every project must belong to at least one category.", project.id, "categories"));
  if (project.chains.length === 0) issues.push(issue("error", "empty-chains", "chains is empty — every project must declare at least one deployment chain.", project.id, "chains"));

  if (project.id !== project.slug) {
    issues.push(
      issue(
        "warning",
        "id-slug-mismatch",
        `id ("${project.id}") and slug ("${project.slug}") differ — docs/PROJECT_REGISTRY.md's naming convention keeps them identical; confirm this divergence is intentional.`,
        project.id,
        "slug"
      )
    );
  }

  if (project.verification.verifiedAt && !isValidIsoDate(project.verification.verifiedAt)) {
    issues.push(issue("warning", "invalid-verified-at-date", `verification.verifiedAt "${project.verification.verifiedAt}" is not a parseable date.`, project.id, "verification.verifiedAt"));
  }

  return issues;
}

function checkLifecycleConflicts(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lifecycle = project.lifecycle;
  if (!lifecycle) return issues;

  if (lifecycle.state === "duplicate" && !lifecycle.duplicateOf) {
    issues.push(issue("error", "lifecycle-duplicate-missing-target", `lifecycle.state is "duplicate" but duplicateOf is unset.`, project.id, "lifecycle.duplicateOf"));
  }
  if (lifecycle.state === "migrated" && !lifecycle.migratedTo) {
    issues.push(issue("error", "lifecycle-migrated-missing-target", `lifecycle.state is "migrated" but migratedTo is unset.`, project.id, "lifecycle.migratedTo"));
  }

  const verificationLevel = project.verificationLevel?.level;
  const verificationStatus = project.verification.status;
  if (
    (verificationLevel === "verified" || verificationLevel === "intelligence-ready") &&
    (verificationStatus === "unverified" || verificationStatus === "flagged")
  ) {
    issues.push(
      issue(
        "warning",
        "verification-level-inconsistent",
        `verificationLevel.level is "${verificationLevel}" (requires verification.status to be "verified" or "community" to have been reached) but verification.status is currently "${verificationStatus}" — per docs/PROJECT_REGISTRY.md this divergence is a real signal worth a re-review, not necessarily a bug.`,
        project.id,
        "verificationLevel.level"
      )
    );
  }

  return issues;
}

/**
 * Validates the full registry. Pure — takes the project list as an
 * argument rather than importing `PROJECTS` itself, so it can be run
 * against a subset, a fixture, or a candidate project before it's added.
 */
export function validateRegistry(projects: Project[]): RegistryValidationReport {
  const issues: ValidationIssue[] = [...checkDuplicateIdentifiers(projects)];

  for (const project of projects) {
    issues.push(...checkGithub(project));
    issues.push(...checkProviderIds(project));
    issues.push(...checkGovernance(project));
    issues.push(...checkUrls(project));
    issues.push(...checkCompleteness(project));
    issues.push(...checkLifecycleConflicts(project));
    for (const contract of project.contracts) {
      issues.push(...checkContract(project.id, project.chains, contract));
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return { issues, errors, warnings, valid: errors.length === 0 };
}

/** Human-readable, terminal/CI-friendly rendering of a validation report. */
export function formatValidationReport(report: RegistryValidationReport): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("Registry Validation Report");
  lines.push("=".repeat(60));
  lines.push(`Status: ${report.valid ? "PASS" : "FAIL"}`);
  lines.push(`Errors: ${report.errors.length}`);
  lines.push(`Warnings: ${report.warnings.length}`);
  lines.push("");

  if (report.errors.length > 0) {
    lines.push("-- Errors " + "-".repeat(49));
    for (const e of report.errors) {
      lines.push(`[ERROR] ${e.code}${e.projectId ? ` (${e.projectId})` : ""}: ${e.message}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("-- Warnings " + "-".repeat(47));
    for (const w of report.warnings) {
      lines.push(`[WARN]  ${w.code}${w.projectId ? ` (${w.projectId})` : ""}: ${w.message}`);
    }
    lines.push("");
  }

  if (report.issues.length === 0) {
    lines.push("No issues found — every project passed every check.");
  }

  lines.push("=".repeat(60));
  return lines.join("\n");
}
