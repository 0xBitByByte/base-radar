/** PR-054 — barrel export. Every future Projects page, Dashboard widget, search feature, or API route should import from here, not reach into individual files. */

export * from "@/lib/projects/types";
export * from "@/lib/projects/build";
export * from "@/lib/projects/service";
export * from "@/lib/projects/collections";
export * from "@/lib/projects/sort";
export * from "@/lib/projects/filter";
export * from "@/lib/projects/search";
export * from "@/lib/projects/pagination";
