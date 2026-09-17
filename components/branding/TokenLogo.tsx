"use client";

import { useState } from "react";
import Image from "next/image";
import { Coins } from "lucide-react";

import { TOKEN_LOGO_UNAVAILABLE_TITLE } from "@/lib/branding/tokens";
import { cn } from "@/lib/utils";

type TokenLogoProps = {
  logoUrl?: string | null;
  /** Additional real candidates, tried in order after `logoUrl` if it fails to load, before falling to the initials badge. Mirrors `ProjectLogo`'s already-proven `fallbackUrls` cascade — the same pattern, not a new one. Not populated by the Token Logo System's own resolver (`lib/branding/resolveTokenLogo.ts`), which converges every tier to one canonical URL per token rather than a candidate list — available for any other caller that still wants multi-candidate cascading. */
  fallbackUrls?: (string | null | undefined)[];
  symbol?: string | null;
  size?: number;
  className?: string;
};

/**
 * Token Logo — a distinct asset from `ProjectLogo` (a project's token is
 * not the project itself). Real images now come from the centralized
 * Token Logo System (`lib/branding/resolveTokenLogo.ts`) — this component
 * stays a pure renderer: given an ordered list of real candidate URLs, it
 * tries each in turn (`onError` advancing to the next, same mechanism
 * `ProjectLogo` already uses) and only falls to the symbol-initials/ghost
 * badge below once every real candidate has failed to load or none exist.
 */
export function TokenLogo({ logoUrl, fallbackUrls, symbol, size = 20, className }: TokenLogoProps) {
  const candidates = [logoUrl, ...(fallbackUrls ?? [])].filter((url): url is string => Boolean(url));
  const uniqueCandidates = Array.from(new Set(candidates));
  const [candidateIndex, setCandidateIndex] = useState(0);
  const iconSize = Math.round(size * 0.6);

  const activeUrl = uniqueCandidates[candidateIndex];

  if (activeUrl) {
    return (
      <Image
        key={activeUrl}
        src={activeUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => setCandidateIndex((index) => index + 1)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  if (symbol) {
    return (
      <span
        style={{ width: size, height: size }}
        className={cn(
          // PR-086.06 — always a solid, opaque white circle with dark text,
          // in both themes (no `dark:` override) — the previous
          // `dark:bg-white/5` fallback was a near-transparent overlay that
          // effectively disappeared against a dark card, the root cause of
          // "token logo hard to recognize" feedback on the Pools page.
          "flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[9px] font-semibold text-radar-light-text",
          className
        )}
        aria-hidden="true"
      >
        {symbol.slice(0, 4).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-dashed border-radar-light-border text-radar-light-muted/50 dark:border-white/10 dark:text-radar-muted/40",
        className
      )}
      aria-hidden="true"
      title={TOKEN_LOGO_UNAVAILABLE_TITLE}
    >
      <Coins style={{ width: iconSize, height: iconSize }} />
    </span>
  );
}
