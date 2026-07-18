import { CheckCircle2 } from "lucide-react";

type RecommendationCardProps = {
  recommendation: string;
};

/** One recommendation, exactly as `lib/portfolio/sections.ts`'s `buildRecommendations` produced it — this component never generates or rewords text, only displays what Portfolio Intelligence already decided. */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-radar-light-border bg-radar-light-card px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02]">
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-radar-primary dark:text-radar-accent"
        aria-hidden="true"
      />
      <span className="text-sm text-radar-light-text dark:text-radar-white">{recommendation}</span>
    </li>
  );
}
