import { SEED_PROJECTS } from "@/data/projects/seed";
import type { Project } from "@/data/projects/types";
import type { ProjectCategory, ProjectTag, VerificationStatus } from "@/data/projects/enums";

/** Returns every project in the registry, in seed order. */
export function getProjects(): Project[] {
  return SEED_PROJECTS;
}

/** Looks up a single project by its `id` or `slug`. Returns undefined if not found. */
export function getProject(idOrSlug: string): Project | undefined {
  return SEED_PROJECTS.find((project) => project.id === idOrSlug || project.slug === idOrSlug);
}

/** Returns all projects tagged with the given category. */
export function getProjectsByCategory(category: ProjectCategory): Project[] {
  return SEED_PROJECTS.filter((project) => project.categories.includes(category));
}

/** Returns all projects tagged with the given tag. */
export function getProjectsByTag(tag: ProjectTag): Project[] {
  return SEED_PROJECTS.filter((project) => project.tags.includes(tag));
}

/** Returns all projects with the given verification status. */
export function getProjectsByVerificationStatus(status: VerificationStatus): Project[] {
  return SEED_PROJECTS.filter((project) => project.verification.status === status);
}

/**
 * Case-insensitive search across name, short description, tags, and categories.
 * Returns an empty array for a blank query rather than the full registry.
 */
export function searchProjects(query: string): Project[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SEED_PROJECTS.filter((project) => {
    const haystack = [
      project.name,
      project.shortDescription,
      ...project.tags,
      ...project.categories,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
