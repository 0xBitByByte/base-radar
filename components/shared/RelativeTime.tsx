"use client";

import { useRelativeTime } from "@/lib/hooks/useRelativeTime";

type RelativeTimeProps = {
  iso: string;
  className?: string;
  /** Shown until the client mounts and can safely compute the real value — see `useRelativeTime`. */
  placeholder?: string;
};

/** Hydration-safe `formatRelativeTime(iso)`, as a drop-in inline element. */
export function RelativeTime({ iso, className, placeholder }: RelativeTimeProps) {
  const label = useRelativeTime(iso, placeholder);
  return <span className={className}>{label}</span>;
}
