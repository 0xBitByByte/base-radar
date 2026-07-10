"use client";

import { useState } from "react";
import Image from "next/image";
import { Coins } from "lucide-react";

import { TOKEN_LOGO_UNAVAILABLE_TITLE } from "@/lib/branding/tokens";
import { cn } from "@/lib/utils";

type TokenLogoProps = {
  logoUrl?: string | null;
  symbol?: string | null;
  size?: number;
  className?: string;
};

/**
 * Token Logo — a distinct asset from `ProjectLogo` (a project's token is
 * not the project itself). No project in this codebase's data model has
 * token-logo data yet (`Identity`/`Project` have no token field), so every
 * call site today renders the reserved-slot state below; the
 * `logoUrl`/`symbol` branches exist for when that data lands, so those
 * call sites won't need a rewrite — never substituting the Project Logo in
 * the meantime (see `QuickViewMetrics`'s Market section).
 */
export function TokenLogo({ logoUrl, symbol, size = 20, className }: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const iconSize = Math.round(size * 0.6);

  if (logoUrl && !failed) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  if (symbol) {
    return (
      <span
        style={{ width: size, height: size }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-radar-light-surface text-[9px] font-semibold text-radar-light-muted dark:bg-white/5 dark:text-radar-muted",
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
