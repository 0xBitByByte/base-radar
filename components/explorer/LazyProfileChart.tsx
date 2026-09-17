"use client";

/**
 * POST-v1 Repository Polish PR — code-splits `ProfileChart` (and, with it,
 * `recharts`) out of the Project Profile route's initial JS payload.
 *
 * Measured before this change: `recharts` was the single largest chunk in
 * the entire app (412KB), and `ProfileChart` — statically imported by
 * `ProfileHeader.tsx`, `ProfilePriceChart.tsx`, `ProfileVolumeTrendPanel.tsx`,
 * and `ProfileTvlChartAsync.tsx` — put it on `/dashboard/projects/[slug]`'s
 * critical path, the single heaviest route in the app (~1.49MB first-load
 * JS, ~330KB heavier than any other route). `ProfileChart` is already
 * `"use client"` with no SSR-meaningful output of its own (a `recharts`
 * `<AreaChart>` needs a hydrated DOM regardless), so deferring it to a
 * dynamic import costs nothing the route wasn't already paying for in
 * hydration time — only the 412KB no longer blocks the route's initial
 * script download.
 *
 * A real `Suspense` fallback (not `next/dynamic`'s `loading` option, which
 * can't see the wrapped component's own props) sized to the exact
 * `height`/`compact` the caller already passes, so there's no layout shift
 * between the placeholder and the real chart settling in.
 */

import { Suspense, lazy, type ComponentProps } from "react";
import type { ProfileChart as ProfileChartComponent } from "@/components/explorer/ProfileChart";

const RealProfileChart = lazy(() =>
  import("@/components/explorer/ProfileChart").then((mod) => ({ default: mod.ProfileChart }))
);

export function ProfileChart(props: ComponentProps<typeof ProfileChartComponent>) {
  const resolvedHeight = props.height ?? (props.compact ? 48 : 220);
  return (
    <Suspense fallback={<div className={props.className} style={{ height: resolvedHeight }} />}>
      <RealProfileChart {...props} />
    </Suspense>
  );
}
