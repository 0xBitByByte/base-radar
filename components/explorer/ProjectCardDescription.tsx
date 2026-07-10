type ProjectCardDescriptionProps = {
  shortDescription: string;
};

/**
 * `identity.shortDescription`, line-clamped so every card keeps the same
 * anatomy regardless of description length (card consistency,
 * docs/explorer/03 §13). `line-clamp-2` alone only caps the maximum —
 * `min-h-8` (measured: two lines at this text size is exactly 32px) also
 * reserves the minimum, so a one-line description doesn't leave every
 * section below it (chips, metrics) sitting higher than a card with a
 * two-line description.
 */
export function ProjectCardDescription({ shortDescription }: ProjectCardDescriptionProps) {
  return (
    <p className="line-clamp-2 min-h-8 text-xs text-radar-light-muted dark:text-radar-muted">{shortDescription}</p>
  );
}
