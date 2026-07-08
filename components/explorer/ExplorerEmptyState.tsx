import { PackageSearch } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

/** The registry-has-zero-projects state — docs/explorer/03 §18. No recovery action; nothing to clear. */
export function ExplorerEmptyState() {
  return (
    <EmptyState
      icon={PackageSearch}
      title="No projects in the registry yet"
      description="Once a project is added to the Project Registry, it will appear here."
    />
  );
}
