/** Public barrel for the Discovery Engine — see docs/DISCOVERY_ENGINE.md. */

export * from "@/lib/discovery/types";
export * from "@/lib/discovery/provider";
export * from "@/lib/discovery/normalize";
export * from "@/lib/discovery/duplicates";
export * from "@/lib/discovery/queue";
export * from "@/lib/discovery/health";
export * from "@/lib/discovery/engine";
// PR-053 — Live Project Discovery Engine additions.
export * from "@/lib/discovery/dedupe";
export * from "@/lib/discovery/registryMatch";
export * from "@/lib/discovery/classify";
export * from "@/lib/discovery/confidence";
export * from "@/lib/discovery/status";
export * from "@/lib/discovery/enrich";
export * from "@/lib/discovery/project";
