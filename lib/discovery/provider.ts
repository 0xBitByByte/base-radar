import type { DiscoverySource } from "@/data/projects/enums";
import type { CandidateProject } from "@/lib/discovery/types";

/** What one `DiscoveryProvider.discover()` call returns — a source, its candidates, and when it ran. Never partial across sources: one provider's failure doesn't withhold another's result (see `runDiscovery` in `engine.ts`). */
export type DiscoveryResult = {
  source: DiscoverySource;
  candidates: CandidateProject[];
  fetchedAt: string;
};

/**
 * The common contract every discovery source implements, whether it's
 * backed by a real (if lightweight) provider call today or is a documented
 * placeholder awaiting a future integration. `runDiscovery()` in
 * `engine.ts` only ever depends on this interface, never on any one
 * source's internals — adding a ninth source later means implementing
 * this interface, nothing else.
 */
export interface DiscoveryProvider {
  readonly source: DiscoverySource;
  discover(): Promise<DiscoveryResult>;
}
