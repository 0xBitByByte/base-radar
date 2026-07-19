import type { Metadata } from "next";

import { AutomationPreferencesPage } from "@/components/automation/AutomationPreferencesPage";

export const metadata: Metadata = {
  title: "Automation Preferences",
  description: "Turn the Automation System on or off, and choose which rules are allowed to fire.",
};

/**
 * PR20 Part 3 — renders entirely client-side (`AutomationPreferencesPage`):
 * no server fetch. The master toggle and per-rule enabled state both live
 * in `localStorage` via `lib/automation/preferences.ts`/`lib/automation/rules.ts`.
 */
export default function AutomationPreferencesRoute() {
  return <AutomationPreferencesPage />;
}
