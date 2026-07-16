import { RouteLoading } from "@/components/dashboard/RouteLoading";

/**
 * Same shared `RouteLoading` every other `/dashboard/*` route segment uses
 * (`app/dashboard/loading.tsx`, `app/dashboard/projects/loading.tsx`) — one
 * implementation, not a fourth copy.
 */
export default function ProjectProfileLoading() {
  return <RouteLoading />;
}
