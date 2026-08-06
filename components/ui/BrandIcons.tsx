import { useId } from "react";

import { cn } from "@/lib/utils";

type BrandIconProps = {
  className?: string;
};

/**
 * Shared brand-mark glyphs used anywhere Base Radar links out to an
 * official community channel (landing navbar/footer, dashboard sidebar,
 * Project Profile hero icon row). Centralized here so each mark is defined
 * once instead of duplicated per component.
 *
 * PR-078B (brand-identity correction) — every mark below now renders in its
 * real, official brand color, hardcoded via Tailwind `fill-*` utilities on
 * the `<svg>` itself (never `fill="currentColor"`), so the icon reads as
 * that platform's actual logo regardless of the surrounding button's text
 * color or hover state. GitHub/X/Medium/Mirror use black in light mode and
 * white in dark mode — the same light/dark inversion each of those brands'
 * own guidelines document for their mark on a dark background, not a tint.
 *
 * GitHub/Discord/X/Telegram/Medium/Farcaster/Linktree/Reddit/YouTube path
 * data and hex values are the exact, official output of Simple Icons
 * (simpleicons.org, CC0-licensed), fetched live from `cdn.simpleicons.org`
 * (which serves each mark pre-colored with its real brand hex by default)
 * immediately before writing this file.
 *
 * CoinGecko, DefiLlama, Mirror, LinkedIn, and BaseScan have **no entry in
 * Simple Icons** — confirmed again for this pass (LinkedIn's mark was
 * present in earlier Simple Icons releases but has since been pulled,
 * consistent with LinkedIn's own trademark-enforcement history against
 * open icon libraries; CoinGecko/DefiLlama/Mirror/BaseScan were never
 * listed). No other free, correctly-licensed source of their exact official
 * vector was available, so those five keep a simplified, hand-drawn
 * approximation of their real mark rather than fabricating a pixel-exact
 * copy of a protected logo — now colored with each platform's real brand
 * hue (CoinGecko green, DefiLlama's teal-to-blue gradient already used
 * elsewhere in this app for the same platform, Mirror's black/white,
 * LinkedIn's blue, BaseScan/Base's own blue `#0052FF`) instead of staying
 * monochrome grey.
 */

export function GithubMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#181717] dark:fill-white", className)} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function DiscordMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#5865F2]", className)} aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

export function XMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-black dark:fill-white", className)} aria-hidden="true">
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}

export function LinktreeMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#43E55E]", className)} aria-hidden="true">
      <path d="m13.73635 5.85251 4.00467-4.11665 2.3248 2.3808-4.20064 4.00466h5.9085v3.30473h-5.9365l4.22865 4.10766-2.3248 2.3338L12.0005 12.099l-5.74052 5.76852-2.3248-2.3248 4.22864-4.10766h-5.9375V8.12132h5.9085L3.93417 4.11666l2.3248-2.3808 4.00468 4.11665V0h3.4727zm-3.4727 10.30614h3.4727V24h-3.4727z" />
    </svg>
  );
}

export function TelegramMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#26A5E4]", className)} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function MediumMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-black dark:fill-white", className)} aria-hidden="true">
      <path d="M4.21 0A4.201 4.201 0 0 0 0 4.21v15.58A4.201 4.201 0 0 0 4.21 24h15.58A4.201 4.201 0 0 0 24 19.79v-1.093c-.137.013-.278.02-.422.02-2.577 0-4.027-2.146-4.09-4.832a7.592 7.592 0 0 1 .022-.708c.093-1.186.475-2.241 1.105-3.022a3.885 3.885 0 0 1 1.395-1.1c.468-.237 1.127-.367 1.664-.367h.023c.101 0 .202.004.303.01V4.211A4.201 4.201 0 0 0 19.79 0Zm.198 5.583h4.165l3.588 8.435 3.59-8.435h3.864v.146l-.019.004c-.705.16-1.063.397-1.063 1.254h-.003l.003 10.274c.06.676.424.885 1.063 1.03l.02.004v.145h-4.923v-.145l.019-.005c.639-.144.994-.353 1.054-1.03V7.267l-4.745 11.15h-.261L6.15 7.569v9.445c0 .857.358 1.094 1.063 1.253l.02.004v.147H4.405v-.147l.019-.004c.705-.16 1.065-.397 1.065-1.253V6.987c0-.857-.358-1.094-1.064-1.254l-.018-.004zm19.25 3.668c-1.086.023-1.733 1.323-1.813 3.124H24V9.298a1.378 1.378 0 0 0-.342-.047Zm-1.862 3.632c-.1 1.756.86 3.239 2.204 3.634v-3.634z" />
    </svg>
  );
}

export function FarcasterMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#855DCD]", className)} aria-hidden="true">
      <path d="M18.24.24H5.76C2.5789.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76-2.5789 5.76-5.76V6C24 2.8188 21.4212.24 18.24.24m.8155 17.1662v.504c.2868-.0256.5458.1905.5439.479v.5688h-5.1437v-.5688c-.0019-.2885.2576-.5047.5443-.479v-.504c0-.22.1525-.402.358-.458l-.0095-4.3645c-.1589-1.7366-1.6402-3.0979-3.4435-3.0979-1.8038 0-3.2846 1.3613-3.4435 3.0979l-.0096 4.3578c.2276.0424.5318.2083.5395.4648v.504c.2863-.0256.5457.1905.5438.479v.5688H4.3915v-.5688c-.0019-.2885.2575-.5047.5438-.479v-.504c0-.2529.2011-.4548.4536-.4724v-7.895h-.4905L4.2898 7.008l2.6405-.0005V5.0419h9.9495v1.9656h2.8219l-.6091 2.0314h-.4901v7.8949c.2519.0177.453.2195.453.4724" />
    </svg>
  );
}

/**
 * No official Simple Icons entry (checked again this pass) — Mirror's own
 * real-world branding is minimalist black/white, so the same light/dark
 * invert used for GitHub/X/Medium is the accurate treatment here too, not
 * an invented color.
 */
export function MirrorMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-black dark:fill-white", className)} aria-hidden="true">
      <path d="M12 2 3 6.5V12c0 5.05 3.6 9.36 9 10.5 5.4-1.14 9-5.45 9-10.5V6.5L12 2Zm0 2.24 6.75 3.38V12c0 3.86-2.7 7.16-6.75 8.24V4.24Zm-6.75 5.38V12c0 3.86 2.7 7.16 6.75 8.24V4.24L5.25 7.62Z" />
    </svg>
  );
}

/**
 * No official Simple Icons entry. CoinGecko's real mark is a green
 * coin/gecko face — this simplified approximation now carries that same
 * green (`#8DC63F`, matching this app's own pre-existing CoinGecko hover
 * accent in `lib/branding/socials.ts`) instead of staying grey.
 */
export function CoinGeckoMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#8DC63F]", className)} aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.2 6.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM9 8c1.9 0 3.9.9 5.2 2.3.5.5.3 1.4-.4 1.6-1.7.5-2.8 1.9-2.8 3.6 0 .6-.1 1.1-.4 1.5-1.6-.4-3.3-1.7-4.1-3.5C5.6 11.6 6.6 8 9 8Z" />
    </svg>
  );
}

/**
 * No official Simple Icons entry. Reuses the same teal-to-blue gradient
 * (`#22d3ee` → `#3b82f6`) `TrustedDataSources.tsx` already uses for
 * DefiLlama elsewhere on the landing page, instead of inventing a second,
 * inconsistent color for the same platform. `useId` keeps the gradient's
 * `<linearGradient>` id unique per rendered instance — this mark can appear
 * more than once on the same page (hero row, sidebar, footer).
 */
export function DefiLlamaMark({ className }: BrandIconProps) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M9 2c.3 1.3.9 2.2 1.8 3.1.7-.6 1.5-.9 2.2-.9.9 0 1.7.4 2.2 1.1.7-.4 1.4-.2 1.7.4.3.6.1 1.6-.6 2.6.9 1.4 1.4 3.1 1.4 5 0 1.6-.4 2.9-1 4l1.3 2.7c.2.4-.1.9-.6.9h-2.9l-.6 1.2a.7.7 0 0 1-.6.4H9.6a.7.7 0 0 1-.6-.4L8.4 21H5.5a.65.65 0 0 1-.6-.9L6.2 17.4c-.6-1.1-1-2.4-1-4 0-3.9 2-7 4.4-8.4C9.2 3.9 9 3 9 2Zm2.7 8.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
      />
    </svg>
  );
}

export function RedditMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#FF4500]", className)} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z" />
    </svg>
  );
}

export function YoutubeMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#FF0000]", className)} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/**
 * No official Simple Icons entry — LinkedIn's mark was pulled from Simple
 * Icons (confirmed 404 on both `linkedin` and every documented alternate
 * slug this pass), consistent with LinkedIn's known trademark-enforcement
 * pattern against open icon libraries. This is a generic "in" wordmark
 * badge in LinkedIn's real brand blue (`#0A66C2`), not a traced copy of
 * their protected logo — the same "approximate, never fabricate an exact
 * copy of an unlicensed mark" policy already applied to CoinGecko/DefiLlama/
 * Mirror.
 */
export function LinkedInMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#0A66C2]", className)} aria-hidden="true">
      <rect width="24" height="24" rx="4" />
      <path
        fill="#fff"
        d="M7.2 9.6h2.6V18H7.2Zm1.3-4.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.6 9.6h2.5v1.15h.04c.35-.66 1.2-1.36 2.47-1.36 2.64 0 3.13 1.74 3.13 4v4.6h-2.6v-4.08c0-.97-.02-2.22-1.35-2.22-1.36 0-1.57 1.06-1.57 2.15V18h-2.6Z"
      />
    </svg>
  );
}

/**
 * No official Simple Icons entry — BaseScan (Base's Blockscout-family block
 * explorer) has no listed mark in any free icon library checked. A
 * simplified "search over a block" glyph in Base's own official brand blue
 * (`#0052FF`, the same hex `lib/branding/chains.ts` and `ChainIcons.tsx`
 * already use for Base itself), replacing the fully generic lucide
 * `Compass` this slot used before — closer to a real explorer mark without
 * fabricating an exact copy of a protected logo.
 */
export function BaseScanMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("fill-[#0052FF]", className)} aria-hidden="true">
      <path d="M4 4h8v3H7v10h10v-5h3v8H4Z" />
      <path d="M14 4h6v6h-3V8.24l-4.88 4.88-2.12-2.12L14.88 6H12Z" />
    </svg>
  );
}

/**
 * PR-078B final polish — `docs` isn't a branded platform (no company owns
 * "documentation"), so there's no license question here, unlike the marks
 * above. Filled, rounded, folded-corner document glyph — the same visual
 * language as Google Docs/Notion-style "file" icons, not a trace of any
 * specific product's protected logo. The gradient is now blue-only (two
 * shades of the same hue, `#4F8DF7` → `#2563EB`) — the prior version drifted
 * into violet (`#7C6FF0`) at the bottom, which read as purple rather than
 * blue; this pass keeps the fold/bars unchanged and only corrects the
 * bottom-stop hue. `useId` keeps the gradient id collision-free across
 * repeated instances.
 */
export function DocsMark({ className }: BrandIconProps) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F8DF7" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path fill="#BFDBFE" fillOpacity="0.75" d="M14 2v4a2 2 0 0 0 2 2h4Z" />
      <rect x="7.5" y="12.5" width="9" height="2" rx="1" fill="#fff" />
      <rect x="7.5" y="16.5" width="6" height="2" rx="1" fill="#fff" />
    </svg>
  );
}

/**
 * PR-078B final polish — `website` isn't a branded platform either. Filled
 * blue globe with latitude/longitude lines, the generic "visit website"
 * icon language, not a copy of any browser or search engine's logo.
 * Simplified from the prior pass: removed the white "address bar" band and
 * cursor-pointer accent (those read as literal browser chrome, which this
 * app's icon row — sitting next to single-glyph marks like GitHub/Discord/
 * Telegram — doesn't need) so it's now just the globe + grid, a cleaner fit
 * beside the other single-shape marks.
 */
export function WebsiteMark({ className }: BrandIconProps) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4FA8FA" />
          <stop offset="1" stopColor="#1D6FE0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${gradientId})`} />
      <g fill="none" stroke="#fff" strokeWidth="1.1" strokeOpacity="0.9">
        <ellipse cx="12" cy="12" rx="4.3" ry="10" />
        <path d="M2 12h20M3.2 7.3h17.6M3.2 16.7h17.6" />
      </g>
    </svg>
  );
}
