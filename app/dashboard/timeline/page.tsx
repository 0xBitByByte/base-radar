import type { Metadata } from "next";

import { Timeline } from "@/components/timeline/Timeline";

export const metadata: Metadata = {
  title: "Intelligence Timeline",
  description: "A chronological feed of AI Intelligence, Daily Brief, and Portfolio Intelligence activity across your Watchlist.",
};

/**
 * PR18 — this route renders entirely client-side (`Timeline`): no server
 * fetch, no rebuilding the Timeline here. `useTimeline()` reads the same
 * runtime-cached `getTimeline()` the Dashboard's `TimelineWidget` reads
 * from, so both surfaces always agree.
 */
export default function TimelinePage() {
  return <Timeline />;
}
