import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type RailEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

/** PR-057 — Task 8: a compact `EmptyState` for a single rail (a full-page-sized empty block would be disproportionate inside an otherwise-populated page). Every rail passes its own specific, honest copy — never a generic "no results." */
export function RailEmptyState({ icon, title, description }: RailEmptyStateProps) {
  return <EmptyState icon={icon} title={title} description={description} className="w-full py-6" />;
}
