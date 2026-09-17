"use client";

import { AlertTriangle, Compass, LayoutDashboard, Sparkles, Trophy } from "lucide-react";

import { FloatingSectionNav, type FloatingNavSection } from "@/components/navigation/FloatingSectionNav";

/**
 * PR-086 — the Discover homepage's floating scroll utilities: "Back to
 * Top" and a section-jump helper, targeting real, already-rendered zones
 * (`CollapsibleSection`'s own `id`, now also rendered as a real DOM id; the
 * three curated-rail zone wrappers in `page.tsx`, now `id`-addressable the
 * same way).
 *
 * PR-087 — now a thin wrapper around the shared `FloatingSectionNav` (the
 * same widget the Project Profile page uses via `PROFILE_NAV_SECTIONS`)
 * instead of its own bespoke implementation — one motion/interaction model
 * for every long page in the app, not two independently-maintained ones.
 */
const JUMP_SECTIONS: readonly FloatingNavSection[] = [
  { id: "kpi-pulse", label: "Overview", icon: LayoutDashboard },
  { id: "smart-views", label: "Smart Views", icon: Sparkles },
  { id: "curated-discovery", label: "Curated Discovery", icon: Compass },
  { id: "leaderboards", label: "Leaderboards", icon: Trophy },
  { id: "needs-attention", label: "Needs Your Attention", icon: AlertTriangle },
];

export function DirectoryFloatingNav() {
  return <FloatingSectionNav sections={JUMP_SECTIONS} />;
}
