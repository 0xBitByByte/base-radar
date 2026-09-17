import type { Metadata } from "next";

import { ProfilePage } from "@/components/account/ProfilePage";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your identity on Base Radar — name, avatar, connected wallet, and preferences.",
};

/**
 * V3-PROFILE-002 — replaces the `AccountProfileDialog` modal as the single
 * source of truth for account/profile UI. Entirely client-rendered
 * (`ProfilePage`): every field reads/writes `localStorage` via
 * `lib/account/service.ts`/`lib/wallet/*`/`lib/personalization/*`, no
 * server fetch. No sidebar entry, matching `/dashboard/wallet`'s own
 * precedent — reachable via the Topbar's Account menu.
 */
export default function ProfileRoute() {
  return <ProfilePage />;
}
