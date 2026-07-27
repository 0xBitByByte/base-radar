import { normalizeHandle, normalizeName, normalizeWebsite } from "@/lib/discovery/normalize";
import type { CandidateProject } from "@/lib/discovery/types";
import type { Project } from "@/data/projects/types";

/**
 * Which signals contributed to a `DuplicateMatch` — always the full set
 * that matched, not just the strongest one, so a reviewer can see how
 * confident the match really is. PR-053 adds `coingeckoId`/`defillamaSlug`
 * — Task 3's explicit "matching should consider... CoinGecko id" — as two
 * more independent identifier signals, alongside the original five.
 */
export const DUPLICATE_MATCH_FIELDS = ["name", "website", "github", "contract", "twitter", "coingeckoId", "defillamaSlug"] as const;
export type DuplicateMatchField = (typeof DUPLICATE_MATCH_FIELDS)[number];

/**
 * Points contributed per matched signal, summed and capped at 100. A
 * contract address or CoinGecko id match is weighted highest (both are
 * essentially never a coincidence); `defillamaSlug` is weighted lower than
 * `coingeckoId` because it's a fuzzy, name-derived approximation (see
 * `CandidateProject.defillamaSlug`'s own doc comment), not a real
 * provider-issued identifier; a bare name match is weighted lowest (many
 * unrelated projects share generic words). These weights are a starting
 * heuristic for a future reviewer UI, not a claim of statistical
 * precision — see docs/DISCOVERY_ENGINE.md "Duplicate Detection Strategy".
 */
const MATCH_WEIGHT: Record<DuplicateMatchField, number> = {
  contract: 50,
  coingeckoId: 45,
  github: 30,
  website: 30,
  defillamaSlug: 25,
  twitter: 25,
  name: 20,
};

export type DuplicateMatch = {
  candidateExternalId: string;
  existingProjectId: string;
  /** 0-100, `MATCH_WEIGHT` values summed and capped — never a probability, just a ranking signal. */
  confidence: number;
  matchedOn: DuplicateMatchField[];
};

function matchesContract(candidate: CandidateProject, project: Project): boolean {
  return candidate.contracts.some((candidateContract) =>
    project.contracts.some(
      (projectContract) =>
        projectContract.chain === candidateContract.chain &&
        projectContract.address.toLowerCase() === candidateContract.address.toLowerCase()
    )
  );
}

function matchesGithub(candidate: CandidateProject, project: Project): boolean {
  if (!candidate.github || !project.github) return false;
  if (candidate.github.repo && project.github.repo) {
    return (
      candidate.github.owner.toLowerCase() === project.github.owner.toLowerCase() &&
      candidate.github.repo.toLowerCase() === project.github.repo.toLowerCase()
    );
  }
  return candidate.github.url.toLowerCase() === project.github.url.toLowerCase();
}

function matchesWebsite(candidate: CandidateProject, project: Project): boolean {
  const candidateSite = normalizeWebsite(candidate.website);
  const projectSite = normalizeWebsite(project.websiteUrl);
  return candidateSite !== null && candidateSite === projectSite;
}

function matchesTwitter(candidate: CandidateProject, project: Project): boolean {
  const candidateHandle = normalizeHandle(candidate.socials.twitter);
  const projectHandle = normalizeHandle(project.social.twitter);
  return candidateHandle !== null && candidateHandle === projectHandle;
}

function matchesName(candidate: CandidateProject, project: Project): boolean {
  return candidate.normalizedName === normalizeName(project.name);
}

function matchesCoingeckoId(candidate: CandidateProject, project: Project): boolean {
  return Boolean(candidate.coingeckoId) && candidate.coingeckoId === project.providerIds.coingeckoId;
}

function matchesDefillamaSlug(candidate: CandidateProject, project: Project): boolean {
  return Boolean(candidate.defillamaSlug) && candidate.defillamaSlug === project.providerIds.defillamaSlug;
}

/**
 * Compares one candidate against every existing registry project and
 * returns every possible match with its combined confidence — never
 * merges or mutates anything. Sorted highest-confidence first. An empty
 * result means "no likely duplicate found," which the queue treats as
 * license to route the candidate to "needs-review" rather than
 * "duplicate" (see `queue.ts`).
 */
export function findDuplicateMatches(candidate: CandidateProject, existingProjects: Project[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const project of existingProjects) {
    const matchedOn: DuplicateMatchField[] = [];
    if (matchesContract(candidate, project)) matchedOn.push("contract");
    if (matchesCoingeckoId(candidate, project)) matchedOn.push("coingeckoId");
    if (matchesGithub(candidate, project)) matchedOn.push("github");
    if (matchesWebsite(candidate, project)) matchedOn.push("website");
    if (matchesDefillamaSlug(candidate, project)) matchedOn.push("defillamaSlug");
    if (matchesTwitter(candidate, project)) matchedOn.push("twitter");
    if (matchesName(candidate, project)) matchedOn.push("name");

    if (matchedOn.length === 0) continue;

    const confidence = Math.min(
      100,
      matchedOn.reduce((sum, field) => sum + MATCH_WEIGHT[field], 0)
    );

    matches.push({ candidateExternalId: candidate.externalId, existingProjectId: project.id, confidence, matchedOn });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}
