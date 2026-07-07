type BrandIconProps = {
  className?: string;
};

/**
 * Shared brand-mark glyphs used anywhere Base Radar links out to an
 * official community channel (landing navbar/footer, dashboard sidebar).
 * Centralized here so each mark is defined once instead of duplicated
 * per component.
 */

export function GithubMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.67.8.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function DiscordMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.32 5.37a18.6 18.6 0 0 0-4.6-1.43.07.07 0 0 0-.08.04c-.2.36-.42.82-.57 1.19a17.2 17.2 0 0 0-5.14 0 12 12 0 0 0-.58-1.19.08.08 0 0 0-.08-.04c-1.6.28-3.14.76-4.6 1.43a.07.07 0 0 0-.03.03C1.86 9.6 1.15 13.7 1.5 17.76a.08.08 0 0 0 .03.05 18.8 18.8 0 0 0 5.63 2.85.08.08 0 0 0 .08-.03c.43-.6.82-1.23 1.15-1.9a.07.07 0 0 0-.04-.1 12.4 12.4 0 0 1-1.77-.85.07.07 0 0 1 0-.12c.12-.09.24-.18.35-.27a.07.07 0 0 1 .08 0c3.7 1.69 7.7 1.69 11.37 0a.07.07 0 0 1 .08 0c.12.1.23.18.35.27a.07.07 0 0 1 0 .12c-.56.33-1.16.6-1.77.85a.07.07 0 0 0-.04.1c.34.67.73 1.3 1.15 1.9a.08.08 0 0 0 .08.03 18.7 18.7 0 0 0 5.64-2.85.08.08 0 0 0 .03-.04c.42-4.7-.7-8.77-2.96-12.37a.06.06 0 0 0-.03-.03ZM8.68 15.3c-1.11 0-2.03-1.02-2.03-2.28 0-1.25.9-2.28 2.03-2.28 1.14 0 2.05 1.04 2.03 2.28 0 1.26-.9 2.28-2.03 2.28Zm6.66 0c-1.11 0-2.02-1.02-2.02-2.28 0-1.25.89-2.28 2.02-2.28 1.14 0 2.05 1.04 2.03 2.28 0 1.26-.89 2.28-2.03 2.28Z" />
    </svg>
  );
}

export function XMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LinktreeMark({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0h2v6.94l4.95-4.95 1.41 1.42L15.31 8.4H21v2h-5.69l5.05 5.05-1.41 1.41L14 11.9V19h-2v-7.1l-4.95 4.96-1.41-1.41L10.69 10.4H5v-2h5.69L5.64 3.4l1.41-1.42L12 6.94V0Zm-1 20h2v4h-2v-4Z" />
    </svg>
  );
}
