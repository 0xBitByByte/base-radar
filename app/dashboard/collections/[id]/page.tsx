import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getRawWhaleEvents } from "@/lib/data/aggregate";
import { getLiveProjects } from "@/lib/projects/service";
import { evaluateServerCollections } from "@/lib/smart-collections/aggregate";
import { SMART_COLLECTION_IDS, type SmartCollectionId } from "@/lib/smart-collections/types";
import { SMART_COLLECTION_META } from "@/lib/smart-collections/evaluate";
import { SmartCollectionDetailView } from "@/components/collections/SmartCollectionDetailView";

type CollectionPageProps = { params: Promise<{ id: string }> };

function isSmartCollectionId(id: string): id is SmartCollectionId {
  return (SMART_COLLECTION_IDS as readonly string[]).includes(id);
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isSmartCollectionId(id)) return { title: "Smart Collections" };
  const meta = SMART_COLLECTION_META[id];
  return { title: meta.name, description: meta.description };
}

/** Same data-loading pattern as the index route (`../page.tsx`) — a dedicated route independently awaits the same two real, `cache()`-wrapped sources rather than sharing in-memory state across requests, matching how every existing `/dashboard/projects/<view>` collection route already works. */
export default async function SmartCollectionDetailPage({ params }: CollectionPageProps) {
  const { id } = await params;
  if (!isSmartCollectionId(id)) notFound();

  const [liveProjects, whaleEvents] = await Promise.all([getLiveProjects(), getRawWhaleEvents()]);
  const serverResults = evaluateServerCollections(liveProjects, whaleEvents, new Date().toISOString());
  return <SmartCollectionDetailView collectionId={id} serverResults={serverResults} />;
}
