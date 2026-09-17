import { AlertCard } from "@/components/alerts/AlertCard";
import type { Alert } from "@/lib/alerts/types";
import type { ProjectLogoEntry } from "@/lib/branding/resolveProjectLogos";

type AlertFeedProps = {
  alerts: Alert[];
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
  logoMap: Record<string, ProjectLogoEntry>;
};

/** Pure list renderer — filtering, sorting, and empty-state decisions all live in `AlertsPageClient`; this only ever maps whatever it's given. */
export function AlertFeed({ alerts, onOpen, onTogglePin, logoMap }: AlertFeedProps) {
  return (
    <ul className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onOpen={onOpen} onTogglePin={onTogglePin} logoMap={logoMap} />
      ))}
    </ul>
  );
}
