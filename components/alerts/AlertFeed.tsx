import { AlertCard } from "@/components/alerts/AlertCard";
import type { Alert } from "@/lib/alerts/types";

type AlertFeedProps = {
  alerts: Alert[];
  onOpen: (id: string) => void;
  onTogglePin: (id: string) => void;
};

/** Pure list renderer — filtering, sorting, and empty-state decisions all live in `AlertsPageClient`; this only ever maps whatever it's given. */
export function AlertFeed({ alerts, onOpen, onTogglePin }: AlertFeedProps) {
  return (
    <ul className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onOpen={onOpen} onTogglePin={onTogglePin} />
      ))}
    </ul>
  );
}
