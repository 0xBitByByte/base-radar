import type { Metadata } from "next";

import { AutomationCenter } from "@/components/automation/AutomationCenter";

export const metadata: Metadata = {
  title: "Automation",
  description: "Rules triggered against your Notifications, built entirely from the Automation Engine's own output.",
};

/**
 * PR20 — this route renders entirely client-side (`AutomationCenter`): no
 * server fetch, no rebuilding anything here. `useAutomation()` reads the
 * same runtime-cached `getAutomationResults()` the Dashboard's
 * `AutomationWidget` reads from, so both surfaces always agree.
 */
export default function AutomationPage() {
  return <AutomationCenter />;
}
