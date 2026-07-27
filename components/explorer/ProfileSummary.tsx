import { FileText } from "lucide-react";

import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";

type ProfileSummaryProps = {
  thesis: string;
};

/**
 * PR-050 follow-up Req 1 — "Project Summary," the first thing a reader sees
 * after the Header: what is this project, what category is it in, how
 * verified/healthy is it, what's its TVL/market position. This is the exact
 * same `report.thesis` paragraph (`buildThesis`, `lib/intelligence/report.ts`)
 * that used to sit buried as "Investment Thesis" inside the old monolithic
 * Executive Intelligence card — extracted into its own top-level, clearly
 * labeled section and moved to the top of the page, per the reviewer's
 * mandated "reads like an intelligence report" flow. No new data, no new
 * derivation — `buildThesis` already draws only from real, already-computed
 * registry/intelligence fields and always produces a real paragraph (even
 * for the sparsest project in the registry), so there is no empty-state case
 * to handle here.
 */
export function ProfileSummary({ thesis }: ProfileSummaryProps) {
  return (
    <ProfileSectionCard id="summary" title="Project Summary" icon={FileText}>
      <p className="text-sm leading-relaxed text-radar-light-text dark:text-radar-white">{thesis}</p>
    </ProfileSectionCard>
  );
}
