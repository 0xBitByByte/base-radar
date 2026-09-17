import type { Metadata } from "next";

import { GuidedReviewPage } from "@/components/wallet/GuidedReviewPage";

export const metadata: Metadata = {
  title: "Guided Portfolio Review",
  description: "A step-by-step walkthrough of your portfolio's health, risk, diversification, automation, analytics, history, and recommendations.",
};

/**
 * V4-FUTURE-002 (Feature 6 — Guided Portfolio Review) — a dedicated route
 * under `/dashboard/wallet`, matching that route's own "no sidebar entry,
 * reachable via a Dashboard shortcut" precedent. Entirely client-rendered,
 * same reason `/dashboard/wallet/page.tsx` is — every hook it composes
 * needs the connected wallet's address.
 */
export default function GuidedReviewRoute() {
  return <GuidedReviewPage />;
}
