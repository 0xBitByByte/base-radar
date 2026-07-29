"use client";

import { MetricItem } from "@/components/explorer/MetricItem";
import { useRelativeTime } from "@/lib/hooks/useRelativeTime";

type MetricItemRelativeTimeProps = {
  label: string;
  iso: string;
  bare?: boolean;
};

/** `MetricItem` whose value is a hydration-safe relative time — `MetricItem`'s `value` prop is a plain string, so it can't take a `<RelativeTime>` element directly. */
export function MetricItemRelativeTime({ label, iso, bare }: MetricItemRelativeTimeProps) {
  const value = useRelativeTime(iso);
  return <MetricItem bare={bare} label={label} value={value} />;
}
