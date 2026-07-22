import type { Project } from "@/data/projects/types";

/**
 * PR-037 — Registry-wide counts for the Projects page header. See
 * docs/PROJECT_REGISTRY.md "Registry Metrics" for what each field means
 * and how it relates to `VerificationLevel`. Every count here is derived
 * from real `Project` records passed in; nothing is a placeholder or
 * hardcoded figure.
 */
export type RegistryMetrics = {
  /** Every project that has ever been surfaced, at any lifecycle/verification stage — the widest funnel stage, so this equals the registry's total size. */
  discovered: number;
  /** `verificationLevel.level` is "indexed" or further along. */
  indexed: number;
  /** `verificationLevel.level` is "verified" or further along. */
  verified: number;
  /** `verificationLevel.level` is "intelligence-ready". */
  intelligenceReady: number;
  /** `lifecycle.discoveredAt` falls within the current calendar month (UTC). */
  newThisMonth: number;
  /** `lifecycle.updatedAt` falls on the current calendar day (UTC). */
  updatedToday: number;
};

const LEVEL_RANK: Record<string, number> = {
  discovered: 0,
  indexed: 1,
  verified: 2,
  "intelligence-ready": 3,
};

function reachedLevel(project: Project, minRank: number): boolean {
  const level = project.verificationLevel?.level;
  if (!level) return false;
  return LEVEL_RANK[level] >= minRank;
}

function isSameUtcDay(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === reference.getUTCFullYear() &&
    d.getUTCMonth() === reference.getUTCMonth() &&
    d.getUTCDate() === reference.getUTCDate()
  );
}

function isSameUtcMonth(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === reference.getUTCFullYear() && d.getUTCMonth() === reference.getUTCMonth();
}

/**
 * Computes real `RegistryMetrics` from a list of projects. A project with
 * no `verificationLevel` field (every current seed project) simply doesn't
 * count toward `indexed`/`verified`/`intelligenceReady` — it is not
 * assumed to have reached any particular level. Nothing here is
 * estimated or inferred beyond what each project's own fields record.
 */
export function computeRegistryMetrics(projects: Project[], now: Date = new Date()): RegistryMetrics {
  let indexed = 0;
  let verified = 0;
  let intelligenceReady = 0;
  let newThisMonth = 0;
  let updatedToday = 0;

  for (const project of projects) {
    if (reachedLevel(project, LEVEL_RANK.indexed)) indexed++;
    if (reachedLevel(project, LEVEL_RANK.verified)) verified++;
    if (reachedLevel(project, LEVEL_RANK["intelligence-ready"])) intelligenceReady++;

    const discoveredAt = project.lifecycle?.discoveredAt;
    if (discoveredAt && isSameUtcMonth(discoveredAt, now)) newThisMonth++;

    const updatedAt = project.lifecycle?.updatedAt;
    if (updatedAt && isSameUtcDay(updatedAt, now)) updatedToday++;
  }

  return {
    discovered: projects.length,
    indexed,
    verified,
    intelligenceReady,
    newThisMonth,
    updatedToday,
  };
}
