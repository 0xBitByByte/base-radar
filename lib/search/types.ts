import type { LucideIcon } from "lucide-react";

export type SearchResultType =
  | "command"
  | "project"
  | "timeline"
  | "notification"
  | "automation"
  | "portfolio"
  | "daily-brief";

export type SearchGroup =
  | "Commands"
  | "Projects"
  | "Timeline"
  | "Notifications"
  | "Automation"
  | "Portfolio"
  | "Daily Brief"
  | "Settings";

/**
 * The one common shape every Global Search result normalizes into,
 * regardless of source — a static command (`lib/command/commands.ts`) or a
 * reshaped item from one of five already-computed engine outputs (Timeline,
 * Notifications, Automation, Portfolio Intelligence, Daily Brief) or the
 * static Project Registry. `route` always points at an existing page —
 * nothing here is fabricated ahead of a real destination.
 */
export type SearchableItem = {
  id: string;
  title: string;
  description: string;
  group: SearchGroup;
  type: SearchResultType;
  icon: LucideIcon;
  route: string;
  keywords: string[];
  metadata: Record<string, unknown>;
  /** Human-readable attribution — which layer this result came from (e.g. "Project Registry", "Intelligence Timeline"). */
  source: string;
};
