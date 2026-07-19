import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

/** Reuses the shared `EmptyState` primitive, same as every other feature's empty state this session (Timeline/Notifications/Automation). Copy reflects PR21 Part 2's shift from a command-only palette to Global Search. */
export function CommandEmpty() {
  return (
    <EmptyState icon={SearchX} title="No results found." description="Try another keyword." className="border-none py-8" />
  );
}
