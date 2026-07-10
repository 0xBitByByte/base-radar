"use client";

import { useId } from "react";

type ChainIconProps = {
  className?: string;
};

/**
 * Simplified, faithful vector marks for each supported chain's real brand
 * identity — official brand colors, simplified geometry (not
 * pixel-recreations of the full production logo). Same spirit as
 * `components/ui/BrandIcons.tsx`'s hand-drawn social marks: a real,
 * recognizable representation, never a fabricated or invented one.
 */

export function BaseChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
    </svg>
  );
}

export function EthereumChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="12,1 21,12 12,15.5 3,12" fill="#627EEA" />
      <polygon points="12,15.5 21,12 12,23 3,12" fill="#8A9DED" />
    </svg>
  );
}

export function OptimismChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#FF0420" />
      <path
        d="M8.4 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.4 0c-1.5 0-2.3 1.2-2.3 3s.8 3 2.3 3c1.6 0 2.6-1.3 2.6-3s-1-3-2.6-3Z"
        fill="#fff"
      />
    </svg>
  );
}

export function ArbitrumChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="12,1 22,7 22,17 12,23 2,17 2,7" fill="#213147" />
      <path d="M9 16 12 7l3 9h-2l-1-3-1 3H9Z" fill="#28A0F0" />
    </svg>
  );
}

export function PolygonChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" fill="#8247E5" />
    </svg>
  );
}

export function AvalancheChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#E84142" />
      <path
        d="M9.3 16.2h1.9l-1-3 1.8-3.1 2.8 6.1h1.9L13 7.3a1.1 1.1 0 0 0-1.9 0l-4.1 8.9h1.9l.4-.6Z"
        fill="#fff"
      />
    </svg>
  );
}

export function BnbChainIcon({ className }: ChainIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="#F0B90B">
        <rect x="9.5" y="1.5" width="5" height="5" transform="rotate(45 12 4)" />
        <rect x="9.5" y="17.5" width="5" height="5" transform="rotate(45 12 20)" />
        <rect x="1.5" y="9.5" width="5" height="5" transform="rotate(45 4 12)" />
        <rect x="17.5" y="9.5" width="5" height="5" transform="rotate(45 20 12)" />
        <rect x="9.5" y="9.5" width="5" height="5" transform="rotate(45 12 12)" />
      </g>
    </svg>
  );
}

export function SolanaChainIcon({ className }: ChainIconProps) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradientId})`}>
        <polygon points="4,6 20,6 17,9.2 1,9.2" />
        <polygon points="1,14.8 17,14.8 20,18 4,18" />
        <polygon points="4,10.4 20,10.4 17,13.6 1,13.6" />
      </g>
    </svg>
  );
}
