type ProjectCardDescriptionProps = {
  shortDescription: string;
};

/** `identity.shortDescription`, line-clamped so every card keeps the same anatomy regardless of description length (card consistency, docs/explorer/03 §13). */
export function ProjectCardDescription({ shortDescription }: ProjectCardDescriptionProps) {
  return <p className="line-clamp-2 text-xs text-radar-light-muted dark:text-radar-muted">{shortDescription}</p>;
}
